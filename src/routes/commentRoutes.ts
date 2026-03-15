import { Router } from 'express';
import { getComments, addComment, deleteComment } from '../controllers/commentController';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comments on car listings
 */
const router = Router();

router.get('/:carId', getComments);
router.post('/:carId', authMiddleware, addComment);
router.delete('/:id', authMiddleware, deleteComment);

export default router;
