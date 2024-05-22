import passport from "passport";
import LocalStrategy from "passport-local";
import User from "../models/users.model.js";

function initPassportJS() {
  passport.use(
    new LocalStrategy((username, password, done) => {
      User.findOne({ username }, (err, user) => {
        if (err) {
          return done(err);
        }
        if (!user) {
          return done(null, false, {
            message: `Username ${username} not found`,
          });
        }
        if (!user.comparePassword(password)) {
          return done(null, false, {
            message: "Incorrect username or password",
          });
        }
        return done(null, user);
      });
    })
  );

  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser((id, done) =>
    User.findById(id, (err, user) => done(err, user))
  );
}

export default initPassportJS;
