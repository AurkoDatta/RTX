/**
 * JWT-required middleware for protected routes. Verifies the
 * `Authorization: Bearer <token>` header and attaches the decoded identity
 * as `req.user`; rejects the request with a 401 `HttpError` otherwise.
 */
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { HttpError } from './errorHandler.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new HttpError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header'));
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), email: payload.email };
    next();
  } catch {
    next(new HttpError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
