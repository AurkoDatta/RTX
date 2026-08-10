import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { RenderJobManager } from '../src/services/renderJobManager.js';

function createFakeSpawn() {
  const spawned = [];
  const spawn = vi.fn(() => {
    const emitter = new EventEmitter();
    emitter.cancel = vi.fn();
    spawned.push(emitter);
    return emitter;
  });
  return { spawn, spawned };
}

describe('RenderJobManager', () => {
  it('does not crash the process when a job errors out with no listeners attached', () => {
    const { spawn, spawned } = createFakeSpawn();
    const manager = new RenderJobManager({ spawn, maxConcurrentJobs: 1 });
    const job = manager.createJob(1, { settings: { max_samples: 10 } });

    // No WebSocket client has ever subscribed to this job (e.g. it failed
    // before anyone connected). Node treats an EventEmitter's 'error' event
    // specially -- emitting it with zero listeners throws and kills the
    // whole process -- so settling a job into 'error' must never do that
    // directly on the job's own emitter.
    expect(() => {
      spawned[0].emit('error', {
        type: 'error',
        job_id: job.id,
        code: 'SPAWN_FAILED',
        message: 'renderer binary not found',
      });
    }).not.toThrow();

    expect(job.status).toBe('error');
    expect(job.error).toMatchObject({ code: 'SPAWN_FAILED' });
  });

  it('runs jobs up to the concurrency limit and starts the next queued job as one finishes', () => {
    const { spawn, spawned } = createFakeSpawn();
    const manager = new RenderJobManager({ spawn, maxConcurrentJobs: 1 });

    const jobA = manager.createJob(1, { settings: { max_samples: 10 } });
    const jobB = manager.createJob(1, { settings: { max_samples: 10 } });

    expect(jobA.status).toBe('rendering');
    expect(jobB.status).toBe('queued');
    expect(spawn).toHaveBeenCalledOnce();

    spawned[0].emit('complete', {
      type: 'complete',
      job_id: jobA.id,
      samples: 10,
      elapsed_ms: 1,
      width: 1,
      height: 1,
      encoding: 'rgb8',
      pixels_b64: '',
    });

    expect(jobA.status).toBe('completed');
    expect(jobB.status).toBe('rendering');
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it('cancels a queued job without ever spawning a process for it', () => {
    const { spawn } = createFakeSpawn();
    const manager = new RenderJobManager({ spawn, maxConcurrentJobs: 1 });

    manager.createJob(1, { settings: { max_samples: 10 } }); // occupies the only slot
    const queuedJob = manager.createJob(1, { settings: { max_samples: 10 } });

    expect(manager.cancelJob(queuedJob.id)).toBe(true);
    expect(queuedJob.status).toBe('cancelled');
    expect(spawn).toHaveBeenCalledOnce(); // never spawned for the still-queued job
  });

  it('returns false when cancelling an unknown job id', () => {
    const manager = new RenderJobManager({ spawn: vi.fn() });
    expect(manager.cancelJob('does-not-exist')).toBe(false);
  });
});
