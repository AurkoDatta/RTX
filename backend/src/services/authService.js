/**
 * User registration and authentication: password hashing, credential
 * checking, and JWT issuance. Kept separate from the controller so the
 * hashing/DB/token logic is unit-testable without spinning up Express.
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { pool } from '../db/pool.js';
import { HttpError } from '../middleware/errorHandler.js';

const BCRYPT_ROUNDS = 12;
// Postgres error code for a unique-constraint violation (used here to detect
// a duplicate email without a separate existence check-then-insert, which
// would be racy under concurrent registrations).
const UNIQUE_VIOLATION = '23505';

function toPublicUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

/**
 * Creates a new user with a bcrypt-hashed password. Throws a 409 `HttpError`
 * if the email is already registered.
 */
export async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );
    return toPublicUser(result.rows[0]);
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'EMAIL_TAKEN', 'An account with that email already exists');
    }
    throw err;
  }
}

/**
 * Verifies email/password credentials and returns the matching user.
 * Throws a 401 `HttpError` for either an unknown email or a wrong password
 * -- deliberately not distinguishing the two in the response, so the error
 * can't be used to enumerate registered emails.
 */
export async function authenticateUser({ email, password }) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1`,
    [email]
  );
  const row = result.rows[0];
  if (!row) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }

  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  }

  return toPublicUser(row);
}

/** Issues a signed JWT identifying `user`, valid for `config.jwtExpiresIn`. */
export function issueToken(user) {
  return jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
