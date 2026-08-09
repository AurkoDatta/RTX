/** Preset routes: read-only, unauthenticated (presets are static reference data, not user-owned). */
import { Router } from 'express';
import { list } from '../controllers/presets.controller.js';

const router = Router();

router.get('/', list);

export default router;
