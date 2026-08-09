/**
 * Central error-handling middleware. Routes and services throw `HttpError`
 * (or let Express 5 forward a rejected async handler automatically) instead
 * of formatting their own JSON error responses, so every failure -- expected
 * (validation, auth) or not -- reaches the client in the same shape:
 * `{ error: { code, message } }`.
 */
import { logger } from '../utils/logger.js';

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Express recognizes this as an error-handling middleware by its four
 * declared parameters, regardless of whether `next` is referenced in the body.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err instanceof HttpError ? err.status : 500;
  const code = err instanceof HttpError ? err.code : 'INTERNAL_ERROR';
  // Deliberately-thrown HttpErrors carry a message meant for the client;
  // anything else (a bug, a DB error) gets a generic message so internals
  // never leak, while the real error is still logged server-side.
  const message = err instanceof HttpError ? err.message : 'Internal server error';

  if (!(err instanceof HttpError)) {
    logger.error(err);
  }

  res.status(status).json({ error: { code, message } });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `No route for ${req.method} ${req.path}`,
    },
  });
}
