import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import Car from '../models/Car';

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.id).select('-password -refreshTokens -googleId');
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json(user);
};

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update user profile (own user only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Not authorized
 */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { username, email } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update username
    if (username) {
      user.username = username;
    }

    // Update email
    if (email) {
      // Basic email validation
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ message: "Email already in use" });
      }

      user.email = email;
    }

    // Update profile image if exists
    if (req.file) {
      user.profileImage = req.file.filename;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

  const { username } = req.body;
  const updates: { username?: string; profileImage?: string } = {};

  if (username?.trim()) updates.username = username.trim();

  if (req.file) {
    // Delete old profile image if it's a local file (not a URL)
    const user = await User.findById(req.params.id);
    if (user?.profileImage && !user.profileImage.startsWith('http')) {
      const oldPath = path.join(process.cwd(), 'uploads', user.profileImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    updates.profileImage = req.file.filename;
  }

  const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select(
    '-password -refreshTokens -googleId'
  );

  if (!updated) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json(updated);
};

/**
 * @swagger
 * /users/{id}/cars:
 *   get:
 *     tags: [Users]
 *     summary: Get all car listings by a specific user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of user's car listings
 */
export const getUserCars = async (req: AuthRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [cars, total] = await Promise.all([
    Car.find({ owner: req.params.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username profileImage'),
    Car.countDocuments({ owner: req.params.id }),
  ]);

  res.json({ cars, total, page, totalPages: Math.ceil(total / limit) });
};
