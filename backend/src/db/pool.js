/**
 * Shared PostgreSQL connection pool. A single pool is reused across the
 * whole process rather than opening a connection per request, since pooling
 * amortizes the cost of TCP setup and spawning a Postgres backend process
 * across many short-lived queries.
 */
import pg from 'pg';
import { config } from '../config/index.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });
