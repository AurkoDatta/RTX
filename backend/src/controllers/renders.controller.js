import { HttpError } from '../middleware/errorHandler.js';
import { jobManager } from '../services/renderJobManager.js';

export function start(req, res) {
  const { sceneJson, sceneId } = req.body;
  const job = jobManager.createJob(req.user.id, sceneJson, sceneId ?? null);
  res.status(201).json({ jobId: job.id, status: job.status });
}

export function cancel(req, res) {
  const ok = jobManager.cancelJob(req.params.jobId);
  if (!ok) {
    throw new HttpError(404, 'JOB_NOT_FOUND', 'Render job not found or already finished');
  }
  res.json({ jobId: req.params.jobId, status: 'cancelling' });
}
