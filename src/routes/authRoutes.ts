import { Router } from 'express';
import passport from 'passport';
import { register, login, logout, refresh, googleCallback } from '../controllers/authController';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization
 */
const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/login' }),
  googleCallback
);

export default router;
