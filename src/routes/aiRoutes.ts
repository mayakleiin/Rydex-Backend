import { Router } from "express";
import { searchCars } from "../controllers/aiController";
import { aiRateLimiter } from "../middleware/aiRateLimiter";

/**
 * @swagger
 * tags:
 *   name: AI
 *   description: AI-powered natural language search
 */
const router = Router();

router.post("/search", aiRateLimiter, searchCars);

export default router;
