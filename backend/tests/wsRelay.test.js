import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { attachRenderSocket } from '../src/ws/renderSocketHandler.js';

function createFakeJob(overrides = {}) {
  const job = new EventEmitter();
  Object.assign(
    job,
    {
      id: 'job-1',
      status: 'rendering',
      samplesCompleted: 0,
      maxSamples: 64,
      startedAt: Date.now(),
      result: null,
      error: null,
    },
    overrides
  );
  return job;
}

function createFakeWs() {
  const listeners = {};
  return {
    OPEN: 1,
    readyState: 1,
    send: vi.fn(),
    on: (event, cb) => {
      listeners[event] = cb;
    },
    trigger: (event, ...args) => listeners[event]?.(...args),
  };
}

describe('attachRenderSocket', () => {
  it('sends an initial progress snapshot for an in-progress job on attach', () => {
    const job = createFakeJob({ samplesCompleted: 10, maxSamples: 64 });
    const ws = createFakeWs();

    attachRenderSocket(ws, job);

    expect(ws.send).toHaveBeenCalledOnce();
    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent).toMatchObject({ type: 'progress', samples: 10, max_samples: 64 });
  });

  it('sends the stored terminal result immediately for an already-completed job', () => {
    const job = createFakeJob({
      status: 'completed',
      result: { type: 'complete', job_id: 'job-1', samples: 64 },
    });
    const ws = createFakeWs();

    attachRenderSocket(ws, job);

    const sent = JSON.parse(ws.send.mock.calls[0][0]);
    expect(sent).toEqual({ type: 'complete', job_id: 'job-1', samples: 64 });
  });

  it('relays progress events as JSON text frames', () => {
    const job = createFakeJob();
    const ws = createFakeWs();
    attachRenderSocket(ws, job);
    ws.send.mockClear();

    job.emit('progress', { type: 'progress', job_id: 'job-1', samples: 5, max_samples: 64 });

    expect(ws.send).toHaveBeenCalledOnce();
    expect(typeof ws.send.mock.calls[0][0]).toBe('string');
    expect(JSON.parse(ws.send.mock.calls[0][0])).toMatchObject({ type: 'progress', samples: 5 });
  });

  it('relays frame events as a binary envelope with the correct header and pixel bytes', () => {
    const job = createFakeJob();
    const ws = createFakeWs();
    attachRenderSocket(ws, job);
    ws.send.mockClear();

    const pixels = Buffer.from([1, 2, 3, 4, 5, 6]); // two RGB8 pixels
    job.emit('frame', {
      type: 'frame',
      job_id: 'job-1',
      samples: 12,
      max_samples: 64,
      width: 2,
      height: 1,
      encoding: 'rgb8',
      pixels_b64: pixels.toString('base64'),
    });

    expect(ws.send).toHaveBeenCalledOnce();
    const [payload, opts] = ws.send.mock.calls[0];
    expect(opts).toEqual({ binary: true });
    expect(Buffer.isBuffer(payload)).toBe(true);

    expect(payload.readUInt8(0)).toBe(0x01); // frame message type
    expect(payload.readUInt32LE(1)).toBe(12); // samples
    expect(payload.readUInt16LE(5)).toBe(2); // width
    expect(payload.readUInt16LE(7)).toBe(1); // height
    expect(payload.subarray(9)).toEqual(pixels);
  });

  it('relays complete, cancelled, and error events as JSON text frames', () => {
    const job = createFakeJob();
    const ws = createFakeWs();
    attachRenderSocket(ws, job);
    ws.send.mockClear();

    job.emit('complete', { type: 'complete', job_id: 'job-1', samples: 64 });
    job.emit('cancelled', { type: 'cancelled', job_id: 'job-1', samples: 30 });
    job.emit('error', { type: 'error', job_id: 'job-1', code: 'RENDERER_CRASHED' });

    expect(ws.send).toHaveBeenCalledTimes(3);
    expect(JSON.parse(ws.send.mock.calls[0][0]).type).toBe('complete');
    expect(JSON.parse(ws.send.mock.calls[1][0]).type).toBe('cancelled');
    expect(JSON.parse(ws.send.mock.calls[2][0]).type).toBe('error');
  });

  it('stops relaying events after the socket closes', () => {
    const job = createFakeJob();
    const ws = createFakeWs();
    attachRenderSocket(ws, job);
    ws.send.mockClear();

    ws.trigger('close');
    job.emit('progress', { type: 'progress', job_id: 'job-1', samples: 20 });

    expect(ws.send).not.toHaveBeenCalled();
  });

  it('never calls send once the socket is no longer open', () => {
    const job = createFakeJob();
    const ws = createFakeWs();
    ws.readyState = 3; // CLOSED
    attachRenderSocket(ws, job);

    expect(ws.send).not.toHaveBeenCalled();
  });
});
