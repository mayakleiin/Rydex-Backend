import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Comment from '../models/Comment';

/**
 * @swagger
 * /comments/{carId}:
 *   get:
 *     tags: [Comments]
 *     summary: Get all comments for a car listing
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
export const getComments = async (req: AuthRequest, res: Response): Promise<void> => {
  const comments = await Comment.find({ car: req.params.carId })
    .sort({ createdAt: -1 })
    .populate('author', 'username profileImage');

  res.json(comments);
};

/**
 * @swagger
 * /comments/{carId}:
 *   post:
 *     tags: [Comments]
 *     summary: Add a comment to a car listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 *       400:
 *         description: Text is required
 *       401:
 *         description: Unauthorized
 */
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { text } = req.body;

  if (!text?.trim()) {
    res.status(400).json({ message: 'Comment text is required' });
    return;
  }

  const comment = await Comment.create({
    car: req.params.carId as string,
    author: req.userId!,
    text: text.trim(),
  });

  await comment.populate('author', 'username profileImage');
  res.status(201).json(comment);
};

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     tags: [Comments]
 *     summary: Delete a comment (own comment only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Comment not found
 */
export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(404).json({ message: 'Comment not found' });
    return;
  }

  if (comment.author.toString() !== req.userId) {
    res.status(403).json({ message: 'Not authorized' });
    return;
  }

  await comment.deleteOne();
  res.json({ message: 'Comment deleted' });
};
