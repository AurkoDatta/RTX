import { HttpError } from '../middleware/errorHandler.js';

/** Parses a route `:id` param as a positive integer, or throws a 400. */
export function parseIdParam(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'INVALID_ID', `Invalid id: ${raw}`);
  }
  return id;
}
