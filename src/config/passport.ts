import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';

export const setupPassport = (): void => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth not configured - skipping passport setup');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: `${process.env.SERVER_URL || 'http://localhost:3000'}/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });

          if (!user) {
            const email = profile.emails?.[0]?.value || '';
            user = await User.findOne({ email });

            if (user) {
              user.googleId = profile.id;
              if (!user.profileImage && profile.photos?.[0]?.value) {
                user.profileImage = profile.photos[0].value;
              }
              await user.save();
            } else {
              user = await User.create({
                googleId: profile.id,
                email,
                username: profile.displayName || email.split('@')[0],
                profileImage: profile.photos?.[0]?.value || '',
              });
            }
          }

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
};
