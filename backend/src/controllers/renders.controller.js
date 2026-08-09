import { readFile } from 'node:fs/promises';
import { HttpError } from '../middleware/errorHandler.js';
import { jobManager } from '../services/renderJobManager.js';
import {
  deleteRender,
  getRenderRow,
  listRenders,
  recordCancelledRender,
  recordCompletedRender,
  toPublicRender,
} from '../services/renderService.js';
import { logger } from '../utils/logger.js';
import { parseIdParam } from '../utils/parseIdParam.js';

export function start(req, res) {
  const { sceneJson, sceneId } = req.body;
  const job = jobManager.createJob(req.user.id, sceneJson, sceneId ?? null);

  // Persist the outcome once the job reaches a terminal state this project's
  // data model tracks (completed/cancelled). Errored jobs are reported live
  // over the WebSocket but intentionally not written to the gallery.
  job.once('complete', (msg) => {
    recordCompletedRender(job, msg).catch((err) =>
      logger.error(`failed to persist completed render ${job.id}`, err)
    );
  });
  job.once('cancelled', (msg) => {
    recordCancelledRender(job, msg).catch((err) =>
      logger.error(`failed to persist cancelled render ${job.id}`, err)
    );
  });

  res.status(201).json({ jobId: job.id, status: job.status });
}

export function cancel(req, res) {
  const ok = jobManager.cancelJob(req.params.jobId);
  if (!ok) {
    throw new HttpError(404, 'JOB_NOT_FOUND', 'Render job not found or already finished');
  }
  res.json({ jobId: req.params.jobId, status: 'cancelling' });
}

export async function list(req, res) {
  const renders = await listRenders(req.user.id);
  res.json({ renders });
}

export async function getOne(req, res) {
  const id = parseIdParam(req.params.id);
  const row = await getRenderRow(req.user.id, id);
  res.json({ render: toPublicRender(row) });
}

export async function getImage(req, res) {
  const id = parseIdParam(req.params.id);
  const row = await getRenderRow(req.user.id, id);
  if (!row.image_path) {
    throw new HttpError(404, 'IMAGE_NOT_AVAILABLE', 'This render has no saved image');
  }
  const data = await readFile(row.image_path);
  res.set('Content-Type', 'image/png');
  res.send(data);
}

export async function remove(req, res) {
  const id = parseIdParam(req.params.id);
  await deleteRender(req.user.id, id);
  res.status(204).send();
}
