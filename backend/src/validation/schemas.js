/**
 * Zod schemas for request validation. Centralizing them here (rather than
 * inline in each controller) keeps the accepted shape of every request body
 * -- and the render-job sanity caps in particular -- auditable in one place.
 */
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});
