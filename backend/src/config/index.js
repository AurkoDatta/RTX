/**
 * Centralized environment configuration. Loading and validating env vars
 * here -- rather than reading `process.env` ad hoc throughout the codebase
 * -- means a missing secret fails fast at process startup instead of
 * surfacing as a confusing runtime error deep inside a request handler.
 */
import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  rendererBinaryPath:
    process.env.RENDERER_BINARY_PATH || '../renderer/target/release/renderer',
};
