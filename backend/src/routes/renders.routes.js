/**
 * Render job routes. Job creation/cancellation lives here; the gallery
 * endpoints (list/fetch/delete persisted renders) are added in a later
 * phase alongside the persistence layer that writes completed renders to
 * disk and the database.
 */
import { Router } from 'express';
import { z } from 'zod';
import { cancel, start } from '../controllers/renders.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { sceneJsonSchema } from '../validation/schemas.js';

const startRenderSchema = z.object({
  sceneJson: sceneJsonSchema,
  sceneId: z.number().int().positive().optional(),
});

const router = Router();
router.use(requireAuth);

router.post('/', validateBody(startRenderSchema), start);
router.post('/:jobId/cancel', cancel);

export default router;
