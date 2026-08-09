/**
 * Auth routes: registration and login. Rate-limited more tightly than the
 * rest of the API since these are the endpoints a credential-stuffing or
 * brute-force attempt would target.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.post('/register', authRateLimit, validateBody(registerSchema), register);
router.post('/login', authRateLimit, validateBody(loginSchema), login);

export default router;
