import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRenderSocket } from '../src/hooks/useRenderSocket.js';

vi.mock('../src/hooks/useAuth.js', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

/** A minimal fake WebSocket that lets tests drive open/message/close by hand. */
class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.binaryType = '';
    FakeWebSocket.instances.push(this);
  }

  send() {}

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  triggerOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  triggerMessage(data) {
    this.onmessage?.({ data });
  }
}

function buildFrameEnvelope({ samples, width, height, pixels }) {
  const buffer = new ArrayBuffer(9 + pixels.length);
  const view = new DataView(buffer);
  view.setUint8(0, 0x01);
  view.setUint32(1, samples, true);
  view.setUint16(5, width, true);
  view.setUint16(7, height, true);
  new Uint8Array(buffer, 9).set(pixels);
  return buffer;
}

describe('useRenderSocket', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in the connecting status and opens a socket to the job URL', () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    expect(result.current.status).toBe('connecting');
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toContain('/ws/renders/job-123');
    expect(FakeWebSocket.instances[0].url).toContain('token=test-token');
  });

  it('updates samples/progress on a progress message', async () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    const ws = FakeWebSocket.instances[0];

    act(() => {
      ws.triggerOpen();
      ws.triggerMessage(
        JSON.stringify({
          type: 'progress',
          job_id: 'job-123',
          samples: 5,
          max_samples: 32,
          elapsed_ms: 100,
          eta_ms: 500,
        })
      );
    });

    await waitFor(() => expect(result.current.status).toBe('rendering'));
    expect(result.current.samples).toBe(5);
    expect(result.current.maxSamples).toBe(32);
    expect(result.current.etaMs).toBe(500);
  });

  it('decodes a binary frame envelope into pixel data', async () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    const ws = FakeWebSocket.instances[0];
    const pixels = new Uint8Array([10, 20, 30, 40, 50, 60]);

    act(() => {
      ws.triggerOpen();
      ws.triggerMessage(buildFrameEnvelope({ samples: 4, width: 2, height: 1, pixels }));
    });

    await waitFor(() => expect(result.current.frame).not.toBeNull());
    expect(result.current.frame.samples).toBe(4);
    expect(result.current.frame.width).toBe(2);
    expect(result.current.frame.height).toBe(1);
    expect([...result.current.frame.pixels]).toEqual([10, 20, 30, 40, 50, 60]);
  });

  it('decodes the final frame from a complete message and sets status to completed', async () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    const ws = FakeWebSocket.instances[0];
    const pixels = new Uint8Array([1, 2, 3]);
    const pixelsB64 = btoa(String.fromCharCode(...pixels));

    act(() => {
      ws.triggerOpen();
      ws.triggerMessage(
        JSON.stringify({
          type: 'complete',
          job_id: 'job-123',
          samples: 64,
          elapsed_ms: 2000,
          width: 1,
          height: 1,
          encoding: 'rgb8',
          pixels_b64: pixelsB64,
        })
      );
    });

    await waitFor(() => expect(result.current.status).toBe('completed'));
    expect(result.current.frame.samples).toBe(64);
    expect([...result.current.frame.pixels]).toEqual([1, 2, 3]);
  });

  it('sets an error message on an error event', async () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    const ws = FakeWebSocket.instances[0];

    act(() => {
      ws.triggerOpen();
      ws.triggerMessage(
        JSON.stringify({
          type: 'error',
          job_id: 'job-123',
          code: 'RENDERER_CRASHED',
          message: 'renderer process exited unexpectedly',
        })
      );
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.errorMessage).toBe('renderer process exited unexpectedly');
  });

  it('does not reconnect after a terminal cancelled message', async () => {
    const { result } = renderHook(() => useRenderSocket('job-123'));
    const ws = FakeWebSocket.instances[0];

    act(() => {
      ws.triggerOpen();
      ws.triggerMessage(JSON.stringify({ type: 'cancelled', job_id: 'job-123', samples: 10 }));
    });
    await waitFor(() => expect(result.current.status).toBe('cancelled'));

    act(() => {
      ws.close();
    });

    // No new socket should have been opened to replace the closed one.
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
