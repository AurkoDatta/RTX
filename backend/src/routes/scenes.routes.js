/** Scene CRUD routes. Every route requires a valid JWT; ownership within that is enforced in `sceneService`. */
import { Router } from 'express';
import { create, getOne, list, remove, update } from '../controllers/scenes.controller.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { saveSceneSchema } from '../validation/schemas.js';

const router = Router();
router.use(requireAuth);

router.post('/', validateBody(saveSceneSchema), create);
router.get('/', list);
router.get('/:id', getOne);
router.put('/:id', validateBody(saveSceneSchema), update);
router.delete('/:id', remove);

export default router;
