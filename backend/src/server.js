/**
 * Process entry point. Wraps the Express app in a plain `http.Server`
 * (rather than calling `app.listen()` directly) so a WebSocket server can
 * later attach to the same port via the 'upgrade' event, and starts
 * listening.
 */
import http from 'node:http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

const app = createApp();
const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`backend listening on port ${config.port}`);
});
