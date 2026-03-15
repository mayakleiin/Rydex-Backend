import { Router } from 'express';
import { getUser, updateUser, getUserCars } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/upload';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */
const router = Router();

router.get('/:id', getUser);
router.put('/:id', authMiddleware, upload.single('profileImage'), updateUser);
router.get('/:id/cars', getUserCars);

export default router;
