/**
 * Per-connection relay: subscribes a single WebSocket to one render job's
 * live event stream and forwards each event in the wire format the frontend
 * expects. Multiple browser tabs/clients can subscribe to the same job
 * concurrently -- each connection gets its own listener set, attached here
 * and removed on close, so a disconnected client never leaks a subscription.
 */

const FRAME_MESSAGE_TYPE = 0x01;

/**
 * Wraps a decoded RGB8 pixel buffer in the fixed binary envelope the
 * frontend expects, so it can interpret a binary WS message without pairing
 * it to a separate JSON message (which would risk ordering/pairing bugs):
 * byte 0 = message type (0x01 = frame), bytes 1-4 = sample count (u32 LE),
 * bytes 5-6 = width (u16 LE), bytes 7-8 = height (u16 LE), remaining bytes =
 * raw RGB8 pixel data. Decoding base64 here (once) and relaying raw bytes
 * avoids re-encoding the pixel payload a second time before it reaches the
 * browser.
 */
function buildFrameEnvelope(message) {
  const pixels = Buffer.from(message.pixels_b64, 'base64');
  const header = Buffer.alloc(9);
  header.writeUInt8(FRAME_MESSAGE_TYPE, 0);
  header.writeUInt32LE(message.samples, 1);
  header.writeUInt16LE(message.width, 5);
  header.writeUInt16LE(message.height, 7);
  return Buffer.concat([header, pixels]);
}

function sendJson(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendFrame(ws, message) {
  if (ws.readyState === ws.OPEN) {
    ws.send(buildFrameEnvelope(message), { binary: true });
  }
}

/**
 * Wires `ws` up to relay `job`'s progress/frame/completion events for as
 * long as the connection stays open, and sends an immediate snapshot of the
 * job's current state on attach -- so a client that connects mid-render (or
 * reloads the page after the job finished) doesn't have to wait for the next
 * event to know where things stand.
 */
export function attachRenderSocket(ws, job) {
  const onProgress = (msg) => sendJson(ws, msg);
  const onFrame = (msg) => sendFrame(ws, msg);
  const onComplete = (msg) => sendJson(ws, msg);
  const onCancelled = (msg) => sendJson(ws, msg);
  const onError = (msg) => sendJson(ws, msg);

  job.on('progress', onProgress);
  job.on('frame', onFrame);
  job.on('complete', onComplete);
  job.on('cancelled', onCancelled);
  job.on('error', onError);

  if (job.status === 'completed' || job.status === 'cancelled' || job.status === 'error') {
    sendJson(ws, job.result || job.error || { type: job.status, job_id: job.id, samples: job.samplesCompleted });
  } else {
    sendJson(ws, {
      type: 'progress',
      job_id: job.id,
      samples: job.samplesCompleted,
      max_samples: job.maxSamples,
      elapsed_ms: job.startedAt ? Date.now() - job.startedAt : 0,
      eta_ms: 0,
    });
  }

  const cleanup = () => {
    job.off('progress', onProgress);
    job.off('frame', onFrame);
    job.off('complete', onComplete);
    job.off('cancelled', onCancelled);
    job.off('error', onError);
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
}
