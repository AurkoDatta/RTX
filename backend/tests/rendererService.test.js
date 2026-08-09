import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.fn();
vi.mock('node:child_process', () => ({ spawn: (...args) => spawnMock(...args) }));

// Imported after the mock is registered so `rendererService` picks up the
// mocked `spawn`.
const { spawnRenderJob, SIGKILL_GRACE_MS } = await import('../src/services/rendererService.js');

function createFakeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { write: vi.fn(), end: vi.fn() };
  child.kill = vi.fn();
  child.killed = false;
  return child;
}

describe('spawnRenderJob', () => {
  let child;

  beforeEach(() => {
    child = createFakeChild();
    spawnMock.mockReset().mockReturnValue(child);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the scene JSON to stdin and closes it', () => {
    const sceneJson = { scene: {}, settings: {} };
    spawnRenderJob('job-1', sceneJson);

    expect(child.stdin.write).toHaveBeenCalledWith(JSON.stringify(sceneJson));
    expect(child.stdin.end).toHaveBeenCalledOnce();
  });

  it('passes --job-id to the renderer binary', () => {
    spawnRenderJob('job-42', { scene: {}, settings: {} });
    const [, args] = spawnMock.mock.calls[0];
    expect(args).toEqual(['--job-id', 'job-42']);
  });

  it('emits progress and frame events parsed from stdout', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    const onProgress = vi.fn();
    const onFrame = vi.fn();
    emitter.on('progress', onProgress);
    emitter.on('frame', onFrame);

    child.stdout.emit('data', '{"type":"progress","job_id":"job-1","samples":1}\n');
    child.stdout.emit('data', '{"type":"frame","job_id":"job-1","samples":1,"pixels_b64":"AA"}\n');

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'progress', samples: 1 })
    );
    expect(onFrame).toHaveBeenCalledWith(expect.objectContaining({ type: 'frame' }));
  });

  it('emits complete and does not synthesize an error on clean exit', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    const onComplete = vi.fn();
    const onError = vi.fn();
    emitter.on('complete', onComplete);
    emitter.on('error', onError);

    child.stdout.emit('data', '{"type":"complete","job_id":"job-1","samples":64}\n');
    child.emit('exit', 0, null);

    expect(onComplete).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it('synthesizes a RENDERER_CRASHED error if the process exits with no terminal message', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    const onError = vi.fn();
    emitter.on('error', onError);

    // No 'complete'/'cancelled'/'error' IPC message was ever sent.
    child.emit('exit', 1, null);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', code: 'RENDERER_CRASHED' })
    );
  });

  it('synthesizes a SPAWN_FAILED error if the child process itself fails to start', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    const onError = vi.fn();
    emitter.on('error', onError);

    child.emit('error', new Error('ENOENT'));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', code: 'SPAWN_FAILED', message: 'ENOENT' })
    );
  });

  it('does not synthesize a crash error after error was already reported by the exit handler', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    const onError = vi.fn();
    emitter.on('error', onError);

    child.emit('error', new Error('ENOENT'));
    child.emit('exit', null, null);

    // Only the SPAWN_FAILED error, not an additional RENDERER_CRASHED one.
    expect(onError).toHaveBeenCalledOnce();
  });

  it('sends SIGTERM on cancel, then escalates to SIGKILL after the grace period if still alive', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    emitter.cancel();

    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(child.kill).not.toHaveBeenCalledWith('SIGKILL');

    vi.advanceTimersByTime(SIGKILL_GRACE_MS);

    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('does not escalate to SIGKILL if the process already exited before the grace period elapses', () => {
    const emitter = spawnRenderJob('job-1', { scene: {}, settings: {} });
    emitter.cancel();
    child.killed = true;

    vi.advanceTimersByTime(SIGKILL_GRACE_MS);

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).not.toHaveBeenCalledWith('SIGKILL');
  });
});
