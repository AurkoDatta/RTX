/**
 * Subscribes to a render job's live WebSocket stream: binary frame envelopes
 * (decoded into a pixel buffer + dimensions) and JSON progress/completion
 * messages. Reconnects with capped exponential backoff if the connection
 * drops before the job reaches a terminal state -- a render can run for tens
 * of seconds, and a transient network blip shouldn't strand the client on a
 * dead connection for the rest of it.
 */
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth.js';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';
const MAX_RECONNECT_DELAY_MS = 8000;
const FRAME_MESSAGE_TYPE = 0x01;

function decodeFrameEnvelope(buffer) {
  const view = new DataView(buffer);
  const samples = view.getUint32(1, true);
  const width = view.getUint16(5, true);
  const height = view.getUint16(7, true);
  const pixels = new Uint8Array(buffer, 9);
  return { samples, width, height, pixels };
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function useRenderSocket(jobId) {
  const { token } = useAuth();
  const [frame, setFrame] = useState(null);
  const [samples, setSamples] = useState(0);
  const [maxSamples, setMaxSamples] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [etaMs, setEtaMs] = useState(0);
  const [status, setStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  const socketRef = useRef(null);
  const reconnectDelayRef = useRef(500);
  const reconnectTimerRef = useRef(null);
  const terminalRef = useRef(false);

  useEffect(() => {
    if (!jobId || !token) return undefined;

    let cancelled = false;
    terminalRef.current = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(`${WS_URL}/ws/renders/${jobId}?token=${token}`);
      ws.binaryType = 'arraybuffer';
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectDelayRef.current = 500;
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          const view = new DataView(event.data);
          if (view.getUint8(0) === FRAME_MESSAGE_TYPE) {
            setFrame(decodeFrameEnvelope(event.data));
          }
          return;
        }

        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'progress':
            setStatus('rendering');
            setSamples(message.samples);
            setMaxSamples(message.max_samples);
            setElapsedMs(message.elapsed_ms);
            setEtaMs(message.eta_ms);
            break;
          case 'complete':
            terminalRef.current = true;
            setStatus('completed');
            setSamples(message.samples);
            // `complete` has no `max_samples` field (see the IPC protocol --
            // it's implicit: reaching `complete` means the target was hit).
            // A fast job can finish before the client's WS even connects, in
            // which case no `progress` message ever set `maxSamples`, so set
            // it here too or the progress bar would read 0% on a done job.
            setMaxSamples(message.samples);
            setElapsedMs(message.elapsed_ms);
            setEtaMs(0);
            // The `complete` message carries the final frame as base64 JSON
            // (not a binary envelope) since it's a one-off, not part of the
            // throttled progressive stream -- decode it directly so the
            // canvas ends on the true final image, not the last-throttled one.
            setFrame({
              samples: message.samples,
              width: message.width,
              height: message.height,
              pixels: base64ToUint8Array(message.pixels_b64),
            });
            break;
          case 'cancelled':
            terminalRef.current = true;
            setStatus('cancelled');
            setSamples(message.samples);
            break;
          case 'error':
            terminalRef.current = true;
            setStatus('error');
            setErrorMessage(message.message || 'The render failed.');
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        if (cancelled || terminalRef.current) return;
        reconnectTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS);
          connect();
        }, reconnectDelayRef.current);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [jobId, token]);

  return { frame, samples, maxSamples, elapsedMs, etaMs, status, errorMessage };
}
