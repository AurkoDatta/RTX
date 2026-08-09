import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { encodePng, RENDERS_STORAGE_DIR } from '../src/services/pngEncodeService.js';
import {
  deleteRender,
  getRenderRow,
  listRenders,
  recordCancelledRender,
  recordCompletedRender,
} from '../src/services/renderService.js';

const app = createApp();
const createdEmails = [];

async function registerAndLogin() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correct horse battery' });
  return { token: res.body.token, userId: res.body.user.id };
}

afterAll(async () => {
  // Only this file's own rows -- a broad LIKE cleanup would race with other
  // test files running concurrently against the same shared dev database.
  if (createdEmails.length > 0) {
    await pool.query(
      'DELETE FROM renders WHERE user_id IN (SELECT id FROM users WHERE email = ANY($1::text[]))',
      [createdEmails]
    );
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
  }
  await pool.end();
});

describe('encodePng', () => {
  it('produces a PNG that decodes back to the original RGB8 pixels', () => {
    // A 2x1 image: one red pixel, one green pixel.
    const rgb8 = Buffer.from([255, 0, 0, 0, 255, 0]);
    const pngBytes = encodePng(rgb8, 2, 1);

    const decoded = PNG.sync.read(pngBytes);
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);
    // Decoded data is RGBA; check the RGB channels match and alpha is opaque.
    expect([...decoded.data]).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
  });
});

describe('render persistence', () => {
  it('records a completed job as a database row with a saved PNG', async () => {
    const { userId } = await registerAndLogin();
    const jobId = randomUUID();
    const job = { id: jobId, userId, sceneId: null };
    const rgb8 = Buffer.from([10, 20, 30, 40, 50, 60]);
    const message = {
      samples: 32,
      elapsed_ms: 500,
      width: 2,
      height: 1,
      pixels_b64: rgb8.toString('base64'),
    };

    await recordCompletedRender(job, message);

    const row = await getRenderRow(userId, (await listRenders(userId))[0].id);
    expect(row.status).toBe('completed');
    expect(row.samples_completed).toBe(32);
    expect(row.render_time_ms).toBe(500);
    expect(row.image_path).toBe(path.join(RENDERS_STORAGE_DIR, `${jobId}.png`));

    const savedFile = await readFile(row.image_path);
    const decoded = PNG.sync.read(savedFile);
    expect(decoded.width).toBe(2);
    expect(decoded.height).toBe(1);

    await unlink(row.image_path);
  });

  it('records a cancelled job with no image path', async () => {
    const { userId } = await registerAndLogin();
    const job = { id: randomUUID(), userId, sceneId: null };

    await recordCancelledRender(job, { samples: 5 });

    const [render] = await listRenders(userId);
    expect(render.status).toBe('cancelled');
    expect(render.samplesCompleted).toBe(5);
    expect(render.imageUrl).toBeNull();
  });
});

describe('gallery CRUD via HTTP', () => {
  it('lists only the requesting user\'s renders', async () => {
    const owner = await registerAndLogin();
    const other = await registerAndLogin();

    await recordCompletedRender(
      { id: randomUUID(), userId: owner.userId, sceneId: null },
      { samples: 10, elapsed_ms: 100, width: 1, height: 1, pixels_b64: Buffer.from([1, 2, 3]).toString('base64') }
    );

    const ownerRes = await request(app)
      .get('/api/renders')
      .set({ Authorization: `Bearer ${owner.token}` });
    expect(ownerRes.body.renders.length).toBeGreaterThanOrEqual(1);

    const otherRes = await request(app)
      .get('/api/renders')
      .set({ Authorization: `Bearer ${other.token}` });
    expect(otherRes.body.renders).toEqual([]);

    // Clean up the saved image for this row.
    const [render] = ownerRes.body.renders;
    if (render.imageUrl) {
      const row = await getRenderRow(owner.userId, render.id);
      await unlink(row.image_path).catch(() => {});
    }
  });

  it('serves the saved image and enforces ownership on fetch/delete', async () => {
    const owner = await registerAndLogin();
    const intruder = await registerAndLogin();

    await recordCompletedRender(
      { id: randomUUID(), userId: owner.userId, sceneId: null },
      {
        samples: 8,
        elapsed_ms: 50,
        width: 1,
        height: 1,
        pixels_b64: Buffer.from([200, 100, 50]).toString('base64'),
      }
    );
    const listRes = await request(app)
      .get('/api/renders')
      .set({ Authorization: `Bearer ${owner.token}` });
    const renderId = listRes.body.renders[0].id;

    const imageRes = await request(app)
      .get(`/api/renders/${renderId}/image`)
      .set({ Authorization: `Bearer ${owner.token}` });
    expect(imageRes.status).toBe(200);
    expect(imageRes.headers['content-type']).toBe('image/png');

    const intruderRes = await request(app)
      .get(`/api/renders/${renderId}`)
      .set({ Authorization: `Bearer ${intruder.token}` });
    expect(intruderRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/renders/${renderId}`)
      .set({ Authorization: `Bearer ${owner.token}` });
    expect(deleteRes.status).toBe(204);

    const afterDelete = await request(app)
      .get(`/api/renders/${renderId}`)
      .set({ Authorization: `Bearer ${owner.token}` });
    expect(afterDelete.status).toBe(404);
  });

  it('deleteRender removes the saved PNG file from disk', async () => {
    const { userId } = await registerAndLogin();
    const jobId = randomUUID();
    await recordCompletedRender(
      { id: jobId, userId, sceneId: null },
      { samples: 4, elapsed_ms: 10, width: 1, height: 1, pixels_b64: Buffer.from([1, 1, 1]).toString('base64') }
    );
    const [render] = await listRenders(userId);
    const row = await getRenderRow(userId, render.id);

    await expect(readFile(row.image_path)).resolves.toBeInstanceOf(Buffer);
    await deleteRender(userId, render.id);
    await expect(readFile(row.image_path)).rejects.toThrow();
  });
});
