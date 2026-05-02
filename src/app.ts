import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import passport from 'passport';

import { setupPassport } from './config/passport';
import { setupSwagger } from './config/swagger';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import carRoutes from './routes/carRoutes';
import commentRoutes from './routes/commentRoutes';
import aiRoutes from './routes/aiRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Setup Google OAuth strategy
setupPassport();

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/cars', carRoutes);
app.use('/comments', commentRoutes);
app.use('/ai', aiRoutes);

// Swagger docs
setupSwagger(app);

// Global JSON error handler — must be last
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: err.message || 'Internal server error' });
});

export default app;
