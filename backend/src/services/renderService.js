/**
 * Gallery persistence for render jobs: records completed/cancelled jobs to
 * the `renders` table (saving the final PNG to disk for completed ones), and
 * backs the gallery CRUD endpoints. Kept separate from `rendererService.js`
 * (process spawning) and `renderJobManager.js` (in-memory job lifecycle) --
 * this is the layer that turns a finished job into a durable database row.
 */
import { unlink } from 'node:fs/promises';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { saveRenderPng } from './pngEncodeService.js';

export function toPublicRender(row) {
  return {
    id: row.id,
    sceneId: row.scene_id,
    samplesCompleted: row.samples_completed,
    renderTimeMs: row.render_time_ms,
    status: row.status,
    imageUrl: row.image_path ? `/api/renders/${row.id}/image` : null,
    createdAt: row.created_at,
  };
}

/**
 * Persists a completed job: saves the final frame as a PNG on disk, then
 * inserts a `renders` row pointing to it. A PNG write failure is logged but
 * doesn't stop the DB row from being written (with a null image path) --
 * losing the thumbnail image is preferable to losing the job's record
 * entirely from a user's render history.
 */
export async function recordCompletedRender(job, message) {
  const pixels = Buffer.from(message.pixels_b64, 'base64');
  let imagePath = null;
  try {
    imagePath = await saveRenderPng(job.id, pixels, message.width, message.height);
  } catch (err) {
    logger.error(`failed to save PNG for render job ${job.id}`, err);
  }

  await pool.query(
    `INSERT INTO renders (user_id, scene_id, image_path, samples_completed, render_time_ms, status)
     VALUES ($1, $2, $3, $4, $5, 'completed')`,
    [job.userId, job.sceneId, imagePath, message.samples, message.elapsed_ms]
  );
}

/** Persists a cancelled job: no image, just the sample count reached. */
export async function recordCancelledRender(job, message) {
  await pool.query(
    `INSERT INTO renders (user_id, scene_id, image_path, samples_completed, status)
     VALUES ($1, $2, NULL, $3, 'cancelled')`,
    [job.userId, job.sceneId, message.samples]
  );
}

export async function listRenders(userId) {
  const result = await pool.query(
    `SELECT id, scene_id, image_path, samples_completed, render_time_ms, status, created_at
     FROM renders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(toPublicRender);
}

/** Returns the raw DB row (not the public shape) since callers also need `image_path` for streaming. */
export async function getRenderRow(userId, id) {
  const result = await pool.query(
    `SELECT id, scene_id, image_path, samples_completed, render_time_ms, status, created_at
     FROM renders WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, 'RENDER_NOT_FOUND', 'Render not found');
  }
  return row;
}

export async function deleteRender(userId, id) {
  const result = await pool.query(
    'DELETE FROM renders WHERE id = $1 AND user_id = $2 RETURNING image_path',
    [id, userId]
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, 'RENDER_NOT_FOUND', 'Render not found');
  }

  const imagePath = result.rows[0].image_path;
  if (imagePath) {
    try {
      await unlink(imagePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        logger.error(`failed to delete render image ${imagePath}`, err);
      }
    }
  }
}
