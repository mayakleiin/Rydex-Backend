import { Router } from "express";
import {
  getCars,
  getCar,
  createCar,
  updateCar,
  deleteCar,
  toggleLike,
} from "../controllers/carController";
import { authMiddleware } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";

/**
 * @swagger
 * tags:
 *   name: Cars
 *   description: Car rental listings
 */
const router = Router();

router.get("/", getCars);
router.get("/:id", getCar);
router.post("/", authMiddleware, upload.array("images", 8), createCar);
router.put("/:id", authMiddleware, upload.array("images", 8), updateCar);
router.delete("/:id", authMiddleware, deleteCar);
router.post("/:id/like", authMiddleware, toggleLike);

export default router;
