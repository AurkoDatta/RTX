/**
 * WebSocket server for live render-job streaming. Attaches to the same HTTP
 * server as the Express app via the 'upgrade' event (one port for both REST
 * and WS) rather than listening separately, and only accepts connections to
 * `/ws/renders/:jobId?token=<jwt>`. Browsers cannot set custom headers on the
 * WebSocket handshake, so the JWT travels as a query parameter here instead
 * of the `Authorization` header `requireAuth` uses for REST routes.
 */
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { config } from '../config/index.js';
import { jobManager } from '../services/renderJobManager.js';
import { logger } from '../utils/logger.js';
import { attachRenderSocket } from './renderSocketHandler.js';

const RENDER_WS_PATH = /^\/ws\/renders\/([^/?]+)$/;

function rejectUpgrade(socket, statusLine) {
  socket.write(`HTTP/1.1 ${statusLine}\r\n\r\n`);
  socket.destroy();
}

export function createWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    const match = url.pathname.match(RENDER_WS_PATH);
    if (!match) {
      rejectUpgrade(socket, '404 Not Found');
      return;
    }

    const jobId = match[1];
    const token = url.searchParams.get('token');
    try {
      jwt.verify(token, config.jwtSecret);
    } catch {
      rejectUpgrade(socket, '401 Unauthorized');
      return;
    }

    const job = jobManager.getJob(jobId);
    if (!job) {
      rejectUpgrade(socket, '404 Not Found');
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      attachRenderSocket(ws, job);
    });
  });

  wss.on('error', (err) => logger.error('WebSocket server error', err));

  return wss;
}
