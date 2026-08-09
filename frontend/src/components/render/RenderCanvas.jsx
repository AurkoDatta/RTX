/**
 * Renders the live/final RGB8 frame buffer to a canvas, redrawing whenever a
 * new frame arrives. Framed with corner-bracket "viewfinder" styling and a
 * monospace telemetry strip along the bottom edge -- this project's
 * signature visual device, echoed wherever a render preview appears.
 */
import { useEffect, useRef } from 'react';

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function RenderCanvas({ frame, samples, maxSamples, elapsedMs, etaMs }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!frame) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== frame.width || canvas.height !== frame.height) {
      canvas.width = frame.width;
      canvas.height = frame.height;
    }

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(frame.width, frame.height);
    // Expand RGB8 into RGBA for the canvas; alpha is always fully opaque
    // since the renderer has no transparency concept.
    for (let src = 0, dst = 0; src < frame.pixels.length; src += 3, dst += 4) {
      imageData.data[dst] = frame.pixels[src];
      imageData.data[dst + 1] = frame.pixels[src + 1];
      imageData.data[dst + 2] = frame.pixels[src + 2];
      imageData.data[dst + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
  }, [frame]);

  if (!frame) {
    return (
      <div className="flex aspect-4/3 w-full max-w-2xl items-center justify-center rounded border border-hairline bg-surface font-mono text-sm text-text-faint">
        Waiting for the first frame…
      </div>
    );
  }

  return (
    <div className="relative inline-block max-w-full">
      <canvas ref={canvasRef} className="block max-w-full bg-black" style={{ height: 'auto' }} />

      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-ember" />
        <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-ember" />
        <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-ember" />
        <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-ember" />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-between gap-x-3 gap-y-0.5 bg-void/70 px-2 py-1 font-mono text-[11px] text-ember">
        <span className="whitespace-nowrap">
          {frame.width}×{frame.height}
        </span>
        <span className="whitespace-nowrap">
          {samples}/{maxSamples} spp
        </span>
        <span className="whitespace-nowrap">{formatDuration(elapsedMs)} elapsed</span>
        <span className="whitespace-nowrap">
          {etaMs > 0 ? `${formatDuration(etaMs)} left` : '--:--'}
        </span>
      </div>
    </div>
  );
}
