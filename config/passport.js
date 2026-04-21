const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userModel');
const crypto = require('crypto');
require("dotenv").config(); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    proxy: true
},
async (accessToken, refreshToken, profile, done) => {
    console.log("Google Profile:", profile); 
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            return done(null, user); // User already exists
        } else {
            const referralCode = crypto.randomBytes(3).toString('hex').toUpperCase();

            user = new User({   // Create a new user
                name: profile.displayName,
                email: profile.emails[0].value, 
                googleId: profile.id,
                isGoogleAuth: true,
                referralCode: referralCode
            });
            await user.save();
            return done(null, user);
        }
    } catch (error) {
        console.error("Error in Google Auth:", error); 
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
