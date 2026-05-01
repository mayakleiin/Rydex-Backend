import { Router } from 'express';
import passport from 'passport';
import { register, login, logout, refresh, googleCallback, facebookCallback } from '../controllers/authController';

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

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/auth/login' }),
  facebookCallback
);

export default router;
