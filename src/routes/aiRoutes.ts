import { Router } from 'express';
import { searchCars } from '../controllers/aiController';

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered natural language search
 */
const router = Router();

router.post('/search', searchCars);

export default router;
