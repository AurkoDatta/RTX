/**
 * HTTP layer for registration/login: translates request bodies (already
 * validated by `validateBody`) into `authService` calls and shapes the
 * response. Express 5 forwards rejected promises from async handlers to the
 * error middleware automatically, so service errors (`HttpError`) don't need
 * an explicit try/catch here.
 */
import { authenticateUser, issueToken, registerUser } from '../services/authService.js';

export async function register(req, res) {
  const user = await registerUser(req.body);
  const token = issueToken(user);
  res.status(201).json({ user, token });
}

export async function login(req, res) {
  const user = await authenticateUser(req.body);
  const token = issueToken(user);
  res.status(200).json({ user, token });
}
