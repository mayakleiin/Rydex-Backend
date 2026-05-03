import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/User";

export const setupPassport = (): void => {
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  const googleCallbackUrl =
    process.env.GOOGLE_CALLBACK_URL || `${serverUrl}/auth/google/callback`;

  // Google OAuth
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "Google OAuth not configured - skipping Google passport setup",
    );
  } else {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          callbackURL: googleCallbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await User.findOne({ googleId: profile.id });

            if (!user) {
              const email = profile.emails?.[0]?.value || "";
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
                  username: profile.displayName || email.split("@")[0],
                  profileImage: profile.photos?.[0]?.value || "",
                });
              }
            }

            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        },
      ),
    );
  }

  // Facebook OAuth
  if (!process.env.FACEBOOK_CLIENT_ID || !process.env.FACEBOOK_CLIENT_SECRET) {
    console.warn(
      "Facebook OAuth not configured - skipping Facebook passport setup",
    );
  } else {
    passport.use(
      new FacebookStrategy(
        {
          clientID: process.env.FACEBOOK_CLIENT_ID!,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
          callbackURL: process.env.FACEBOOK_CALLBACK_URL || `${serverUrl}/auth/facebook/callback`,
          profileFields: ["id", "displayName", "photos", "email"],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            let user = await User.findOne({ facebookId: profile.id });

            if (!user) {
              const email = profile.emails?.[0]?.value || "";
              user = await User.findOne({ email });

              if (user) {
                user.facebookId = profile.id;
                if (!user.profileImage && profile.photos?.[0]?.value) {
                  user.profileImage = profile.photos[0].value;
                }
                await user.save();
              } else {
                user = await User.create({
                  facebookId: profile.id,
                  email,
                  username: profile.displayName,
                  profileImage: profile.photos?.[0]?.value || "",
                });
              }
            }

            done(null, user);
          } catch (err) {
            done(err as Error);
          }
        },
      ),
    );
  }
};
