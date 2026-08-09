/**
 * CRUD for user-owned saved scene configurations. Every query scopes by
 * `user_id` in the SQL itself (not just checked after fetching), so one user
 * can never read, modify, or delete another user's scenes.
 */
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/errorHandler.js';

function toPublicScene(row) {
  return {
    id: row.id,
    name: row.name,
    sceneJson: row.scene_json,
    createdAt: row.created_at,
  };
}

export async function createScene(userId, { name, sceneJson }) {
  const result = await pool.query(
    `INSERT INTO scenes (user_id, name, scene_json)
     VALUES ($1, $2, $3)
     RETURNING id, name, scene_json, created_at`,
    [userId, name, sceneJson]
  );
  return toPublicScene(result.rows[0]);
}

export async function listScenes(userId) {
  const result = await pool.query(
    `SELECT id, name, scene_json, created_at FROM scenes
     WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(toPublicScene);
}

export async function getScene(userId, id) {
  const result = await pool.query(
    `SELECT id, name, scene_json, created_at FROM scenes WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, 'SCENE_NOT_FOUND', 'Scene not found');
  }
  return toPublicScene(row);
}

export async function updateScene(userId, id, { name, sceneJson }) {
  const result = await pool.query(
    `UPDATE scenes SET name = $1, scene_json = $2
     WHERE id = $3 AND user_id = $4
     RETURNING id, name, scene_json, created_at`,
    [name, sceneJson, id, userId]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(404, 'SCENE_NOT_FOUND', 'Scene not found');
  }
  return toPublicScene(row);
}

export async function deleteScene(userId, id) {
  const result = await pool.query('DELETE FROM scenes WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ]);
  if (result.rowCount === 0) {
    throw new HttpError(404, 'SCENE_NOT_FOUND', 'Scene not found');
  }
}
