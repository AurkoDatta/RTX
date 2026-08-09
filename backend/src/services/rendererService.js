/**
 * Spawns the Rust renderer as a child process for one render job, feeds it
 * the scene JSON over stdin, and parses its stdout IPC stream into typed
 * events. This is the sole boundary between the Node backend and the Rust
 * renderer -- everything else in the backend deals with plain JS event
 * payloads, never process or IPC-framing details directly.
 */
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { config } from '../config/index.js';
import { IpcLineParser } from './ipcParser.js';

// Grace period between sending SIGTERM and escalating to SIGKILL if the
// renderer hasn't exited on its own. Covers the rare case where it's stuck
// mid-sample-pass (e.g. a very heavy scene) and doesn't reach the
// cancellation check between passes in time.
export const SIGKILL_GRACE_MS = 2000;

const TERMINAL_MESSAGE_TYPES = new Set(['complete', 'cancelled', 'error']);

/**
 * Spawns the renderer binary for `jobId` with `sceneJson` as input. Returns
 * an `EventEmitter` with a `.cancel()` method attached. Emits `progress`,
 * `frame`, `complete`, `error`, and `cancelled` events matching the IPC
 * message types 1:1, an `stderr` event for raw log/panic output, and `exit`
 * once the process itself terminates.
 *
 * If the process exits without ever having sent a terminal IPC message (a
 * crash, or being killed outside of `.cancel()`), a synthetic `error` event
 * is emitted first -- callers only ever need to handle one error path,
 * whether the renderer reported the problem itself or just vanished.
 */
export function spawnRenderJob(jobId, sceneJson) {
  const emitter = new EventEmitter();
  const child = spawn(config.rendererBinaryPath, ['--job-id', jobId], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const parser = new IpcLineParser();
  let settled = false;
  let killTimer = null;

  child.stdout.on('data', (chunk) => {
    for (const message of parser.push(chunk)) {
      if (TERMINAL_MESSAGE_TYPES.has(message.type)) {
        settled = true;
      }
      emitter.emit(message.type, message);
    }
  });

  child.stderr.on('data', (chunk) => {
    emitter.emit('stderr', chunk.toString('utf-8'));
  });

  child.on('error', (err) => {
    settled = true;
    emitter.emit('error', {
      type: 'error',
      job_id: jobId,
      code: 'SPAWN_FAILED',
      message: err.message,
    });
  });

  child.on('exit', (exitCode, signal) => {
    if (killTimer) clearTimeout(killTimer);
    if (!settled) {
      emitter.emit('error', {
        type: 'error',
        job_id: jobId,
        code: 'RENDERER_CRASHED',
        message: `renderer process exited unexpectedly (code=${exitCode}, signal=${signal})`,
      });
    }
    emitter.emit('exit', { exitCode, signal });
  });

  child.stdin.write(JSON.stringify(sceneJson));
  child.stdin.end();

  emitter.cancel = () => {
    child.kill('SIGTERM');
    killTimer = setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, SIGKILL_GRACE_MS);
  };

  return emitter;
}
