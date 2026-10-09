import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../modules/users/user.model.js";

/*
|--------------------------------------------------------------------------
| Google OAuth Strategy Factory
|--------------------------------------------------------------------------
| We create separate Google strategies for:
|   1. Job Seeker
|   2. Recruiter
|
| The selected role is passed through the strategy.
|--------------------------------------------------------------------------
*/

const createGoogleStrategy = (role, callbackURL) => {
  passport.use(
    `google-${role}`,
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          if (!email) {
            return done(new Error("Google account email not available"), null);
          }

          /*
          |--------------------------------------------------------------------------
          | Find existing user by email
          |--------------------------------------------------------------------------
          | This prevents duplicate accounts when someone already registered
          | with the same email using normal email/password registration.
          |--------------------------------------------------------------------------
          */

          let user = await User.findOne({ email });

          if (user) {
            /*
            |--------------------------------------------------------------------------
            | Existing account
            |--------------------------------------------------------------------------
            */

            // Link Google account if it wasn't linked before
            if (!user.googleId) {
              user.googleId = profile.id;
            }

            // Mark account as Google authenticated
            if (user.provider !== "google") {
              user.provider = "google";
            }

            await user.save();

            return done(null, user);
          }

          /*
          |--------------------------------------------------------------------------
          | New Google account
          |--------------------------------------------------------------------------
          */

          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            provider: "google",
            role,
          });

          return done(null, user);
        } catch (error) {
          console.error("Google authentication error:", error);
          return done(error, null);
        }
      },
    ),
  );
};

/*
|--------------------------------------------------------------------------
| Job Seeker Google Strategy
|--------------------------------------------------------------------------
*/

createGoogleStrategy(
  "jobseeker",
  `${process.env.BACKEND_URL}/api/auth/google/jobseeker/callback`,
);

/*
|--------------------------------------------------------------------------
| Recruiter Google Strategy
|--------------------------------------------------------------------------
*/

createGoogleStrategy(
  "recruiter",
  `${process.env.BACKEND_URL}/api/auth/google/recruiter/callback`,
);