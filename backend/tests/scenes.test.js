import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

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

const minimalScene = {
  scene: {
    camera: { position: { x: 0, y: 0, z: 0 }, look_at: { x: 0, y: 0, z: -1 }, vfov: 40 },
    objects: [
      {
        type: 'sphere',
        center: { x: 0, y: 0, z: -1 },
        radius: 0.5,
        material: { type: 'lambertian', albedo: { x: 0.5, y: 0.5, z: 0.5 } },
      },
    ],
  },
  settings: { width: 320, height: 240, max_samples: 32, max_bounce_depth: 4 },
};

afterAll(async () => {
  // Only this file's own rows -- a broad LIKE cleanup would race with other
  // test files running concurrently against the same shared dev database.
  if (createdEmails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
  }
  await pool.end();
});

describe('GET /api/presets', () => {
  it('lists the three built-in preset scenes', async () => {
    const res = await request(app).get('/api/presets');
    expect(res.status).toBe(200);
    expect(res.body.presets).toHaveLength(3);
    const ids = res.body.presets.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['cornell-box', 'reflective-spheres', 'glass-sphere'])
    );
    // Each preset should be a fully-formed scene, ready to hand to a render job.
    expect(res.body.presets[0].sceneJson.scene.objects.length).toBeGreaterThan(0);
  });
});

describe('scenes CRUD', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/scenes');
    expect(res.status).toBe(401);
  });

  it('creates, lists, fetches, updates, and deletes a scene', async () => {
    const { token } = await registerAndLogin();
    const auth = { Authorization: `Bearer ${token}` };

    const createRes = await request(app)
      .post('/api/scenes')
      .set(auth)
      .send({ name: 'My Scene', sceneJson: minimalScene });
    expect(createRes.status).toBe(201);
    const sceneId = createRes.body.scene.id;
    expect(createRes.body.scene.name).toBe('My Scene');

    const listRes = await request(app).get('/api/scenes').set(auth);
    expect(listRes.status).toBe(200);
    expect(listRes.body.scenes.map((s) => s.id)).toContain(sceneId);

    const getRes = await request(app).get(`/api/scenes/${sceneId}`).set(auth);
    expect(getRes.status).toBe(200);
    expect(getRes.body.scene.sceneJson.settings.width).toBe(320);

    const updateRes = await request(app)
      .put(`/api/scenes/${sceneId}`)
      .set(auth)
      .send({ name: 'Renamed Scene', sceneJson: minimalScene });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.scene.name).toBe('Renamed Scene');

    const deleteRes = await request(app).delete(`/api/scenes/${sceneId}`).set(auth);
    expect(deleteRes.status).toBe(204);

    const getAfterDelete = await request(app).get(`/api/scenes/${sceneId}`).set(auth);
    expect(getAfterDelete.status).toBe(404);
  });

  it("prevents one user from accessing another user's scene", async () => {
    const owner = await registerAndLogin();
    const intruder = await registerAndLogin();

    const createRes = await request(app)
      .post('/api/scenes')
      .set({ Authorization: `Bearer ${owner.token}` })
      .send({ name: 'Private Scene', sceneJson: minimalScene });
    const sceneId = createRes.body.scene.id;

    const res = await request(app)
      .get(`/api/scenes/${sceneId}`)
      .set({ Authorization: `Bearer ${intruder.token}` });
    expect(res.status).toBe(404);
  });

  it('rejects a scene exceeding the resolution cap', async () => {
    const { token } = await registerAndLogin();
    const oversized = {
      ...minimalScene,
      settings: { ...minimalScene.settings, width: 4000, height: 3000 },
    };

    const res = await request(app)
      .post('/api/scenes')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Too Big', sceneJson: oversized });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a scene exceeding the sample count cap', async () => {
    const { token } = await registerAndLogin();
    const tooManySamples = {
      ...minimalScene,
      settings: { ...minimalScene.settings, max_samples: 100000 },
    };

    const res = await request(app)
      .post('/api/scenes')
      .set({ Authorization: `Bearer ${token}` })
      .send({ name: 'Too Noisy', sceneJson: tooManySamples });

    expect(res.status).toBe(400);
  });
});
