/** Render job lifecycle (start/cancel) and gallery CRUD, all user-scoped. */
import { Router } from 'express';
import { z } from 'zod';
import {
  cancel,
  getImage,
  getOne,
  list,
  remove,
  start,
} from '../controllers/renders.controller.js';
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
router.get('/', list);
router.get('/:id/image', getImage);
router.get('/:id', getOne);
router.delete('/:id', remove);

export default router;
