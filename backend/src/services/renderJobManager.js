/**
 * In-memory registry of active/queued render jobs. Enforces a concurrency
 * cap on simultaneously-spawned renderer processes (each is a CPU-bound
 * native process competing for the same cores) by queuing additional job
 * starts until a slot frees, and gives the WebSocket layer a single place to
 * subscribe to a job's live event stream regardless of whether it's still
 * queued or already rendering.
 */
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import { spawnRenderJob } from './rendererService.js';

// Cap concurrent renders at half the available cores (minimum 1, maximum 4)
// so a handful of simultaneous requests can't starve the machine -- each
// renderer process already parallelizes internally across cores via rayon.
export const DEFAULT_MAX_CONCURRENT_JOBS = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));

export class RenderJob extends EventEmitter {
  constructor(id, userId, sceneJson, sceneId) {
    super();
    this.id = id;
    this.userId = userId;
    this.sceneJson = sceneJson;
    this.sceneId = sceneId ?? null;
    this.status = 'queued'; // queued | rendering | completed | cancelled | error
    this.samplesCompleted = 0;
    this.maxSamples = sceneJson.settings.max_samples;
    this.startedAt = null;
    this.finishedAt = null;
    /** Set from the `complete` IPC message once the job finishes successfully. */
    this.result = null;
    /** Set from the `error` IPC message (or a synthesized one) if the job fails. */
    this.error = null;
    /** The `rendererService` event emitter for the running process, once started. */
    this.process = null;
  }
}

export class RenderJobManager {
  /**
   * @param {object} [options]
   * @param {number} [options.maxConcurrentJobs]
   * @param {typeof spawnRenderJob} [options.spawn] injected for testing, so
   *   tests can exercise queueing/concurrency logic without spawning real
   *   processes.
   */
  constructor({ maxConcurrentJobs = DEFAULT_MAX_CONCURRENT_JOBS, spawn = spawnRenderJob } = {}) {
    this.maxConcurrentJobs = maxConcurrentJobs;
    this.spawn = spawn;
    this.jobs = new Map();
    this.queue = [];
    this.activeCount = 0;
  }

  createJob(userId, sceneJson, sceneId = null) {
    const job = new RenderJob(randomUUID(), userId, sceneJson, sceneId);
    this.jobs.set(job.id, job);
    this.queue.push(job);
    this.#drainQueue();
    return job;
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  /**
   * Cancels a job in either lifecycle state: if it hasn't started yet,
   * removes it from the queue directly; if it's already running, forwards to
   * the renderer process's own SIGTERM-based cancellation. Returns `false`
   * if the job doesn't exist or has already reached a terminal state.
   */
  cancelJob(id) {
    const job = this.jobs.get(id);
    if (!job) return false;

    if (job.status === 'queued') {
      job.status = 'cancelled';
      job.finishedAt = Date.now();
      this.queue = this.queue.filter((queued) => queued.id !== id);
      job.emit('cancelled', { type: 'cancelled', job_id: id, samples: 0 });
      return true;
    }

    if (job.status === 'rendering' && job.process) {
      job.process.cancel();
      return true;
    }

    return false;
  }

  #drainQueue() {
    while (this.activeCount < this.maxConcurrentJobs && this.queue.length > 0) {
      const job = this.queue.shift();
      this.#start(job);
    }
  }

  #start(job) {
    this.activeCount += 1;
    job.status = 'rendering';
    job.startedAt = Date.now();

    const proc = this.spawn(job.id, job.sceneJson);
    job.process = proc;

    proc.on('progress', (msg) => {
      job.samplesCompleted = msg.samples;
      job.emit('progress', msg);
    });
    proc.on('frame', (msg) => job.emit('frame', msg));
    proc.on('complete', (msg) => this.#settle(job, 'completed', 'result', msg));
    proc.on('cancelled', (msg) => this.#settle(job, 'cancelled', null, msg));
    proc.on('error', (msg) => this.#settle(job, 'error', 'error', msg));
  }

  #settle(job, status, resultField, message) {
    job.status = status;
    job.finishedAt = Date.now();
    if (resultField) job[resultField] = message;
    // `RenderJob` is an EventEmitter, and Node treats the literal 'error'
    // event name specially: emitting it with zero listeners attached throws
    // and crashes the whole process, rather than being a normal no-op like
    // any other event. A job can fail before any WebSocket client has ever
    // subscribed to it (e.g. the renderer binary is missing), so 'error'
    // can't be used here -- 'render-error' carries the same payload without
    // that landmine.
    const eventName = status === 'completed' ? 'complete' : status === 'error' ? 'render-error' : status;
    job.emit(eventName, message);
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.#drainQueue();
  }
}

/** Process-wide singleton used by the routes/WS layer. */
export const jobManager = new RenderJobManager();
