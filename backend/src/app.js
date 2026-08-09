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
import authRoutes from './routes/auth.routes.js';
import presetsRoutes from './routes/presets.routes.js';
import rendersRoutes from './routes/renders.routes.js';
import scenesRoutes from './routes/scenes.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/presets', presetsRoutes);
  app.use('/api/scenes', scenesRoutes);
  app.use('/api/renders', rendersRoutes);

  // The gallery endpoints (GET/DELETE persisted renders) are added in a
  // later phase alongside the completion-time persistence logic.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
