/**
 * Request-body validation middleware factory. Given a zod schema, returns
 * middleware that parses `req.body` against it, replaces `req.body` with the
 * parsed (and coerced/trimmed) result on success, and forwards a 400
 * `HttpError` with the first validation issue on failure -- so route
 * handlers can trust `req.body` matches the schema without re-checking it.
 */
import { HttpError } from './errorHandler.js';

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      const path = firstIssue.path.join('.') || '(body)';
      next(
        new HttpError(400, 'VALIDATION_ERROR', `${path}: ${firstIssue.message}`)
      );
      return;
    }
    req.body = result.data;
    next();
  };
}
