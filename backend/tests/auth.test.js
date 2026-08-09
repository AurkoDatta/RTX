import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
const createdEmails = [];

function uniqueEmail() {
  const email = `test-${randomUUID()}@example.com`;
  createdEmails.push(email);
  return email;
}

afterAll(async () => {
  // Tests run against the real local dev database (no separate test DB in
  // this project's scope). Delete only the specific rows this file created
  // -- a broad `LIKE 'test-%'` cleanup would race with other test files
  // running concurrently against the same database and could delete another
  // file's in-flight user. Also closes the pool so open connections don't
  // keep the vitest process alive.
  if (createdEmails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1::text[])', [createdEmails]);
  }
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token', async () => {
    const email = uniqueEmail();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada Lovelace', email, password: 'correct horse battery' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.password_hash).toBeUndefined();
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'First', email, password: 'correct horse battery' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Second', email, password: 'another password' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('rejects an invalid request body with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const email = uniqueEmail();
    const password = 'correct horse battery';
    await request(app).post('/api/auth/register').send({ name: 'Grace', email, password });

    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects a wrong password with 401', async () => {
    const email = uniqueEmail();
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Grace', email, password: 'correct horse battery' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrong password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail(), password: 'whatever' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
