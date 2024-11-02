const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
require("dotenv").config(); // Ensure dotenv is loaded

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:4001/auth/google/callback' // Check that this matches Google Console
},
async (accessToken, refreshToken, profile, done) => {
    console.log("Google Profile:", profile); // Debugging log
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user);
        } else {
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value, // Ensure correct email structure
                googleId: profile.id,
            });
            await user.save();
            return done(null, user);
        }
    } catch (error) {
        console.error("Error in Google Auth:", error); // Debugging log for errors
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

module.exports = passport;
