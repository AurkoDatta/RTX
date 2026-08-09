/**
 * Live render view: subscribes to a job's WebSocket stream via
 * `useRenderSocket` and displays the progressively-refining canvas, a
 * progress bar, and cancel control.
 */
import { useParams } from 'react-router-dom';
import { ProgressBar } from '../components/render/ProgressBar.jsx';
import { RenderCanvas } from '../components/render/RenderCanvas.jsx';
import { RenderControls } from '../components/render/RenderControls.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useRenderSocket } from '../hooks/useRenderSocket.js';
import { cancelRender } from '../services/rendersApi.js';

export function RenderViewPage() {
  const { jobId } = useParams();
  const { token } = useAuth();
  const { frame, samples, maxSamples, elapsedMs, etaMs, status, errorMessage } =
    useRenderSocket(jobId);

  async function handleCancel() {
    try {
      await cancelRender(jobId, token);
    } catch {
      // The WebSocket's own 'cancelled'/'error' event still drives the
      // displayed status regardless of whether this request succeeds.
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 font-display text-2xl font-semibold">Render</h1>

      <RenderControls status={status} onCancel={handleCancel} />

      <div className="mt-4">
        <ProgressBar samples={samples} maxSamples={maxSamples} />
      </div>

      {errorMessage && <p className="mt-4 text-sm text-error">{errorMessage}</p>}

      <div className="mt-6 flex justify-center">
        <RenderCanvas
          frame={frame}
          samples={samples}
          maxSamples={maxSamples}
          elapsedMs={elapsedMs}
          etaMs={etaMs}
        />
      </div>
    </div>
  );
}
