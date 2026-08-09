/**
 * Express application: middleware, routes, and error handling wired
 * together. Kept separate from `server.js` (which owns the HTTP server and
 * `.listen()` call) so integration tests can import the app and drive it
 * with `supertest` directly, without binding a real network port.
 */
import cors from 'cors';
import express from 'express';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Resource routes (auth, scenes, presets, renders) are mounted here in
  // later phases as each is built out.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
