const express = require('express');
const user_route = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const profileController = require('../controllers/profileController');


user_route.get('/register',userController.loadRegister);
user_route.post('/register',userController.insertUser);

user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res) => {
    res.redirect('/')
});


user_route.get('/verify-otp', userController.loadOTPVerification);
user_route.post('/verify-otp', userController.verifyOTPController);

user_route.get('/login',userController.loadLogin);
user_route.post('/login',userController.login);

user_route.get('/forgot-password', profileController.loadForgotPassword);
user_route.post('/forgot-password', profileController.forgotEmailValid);
user_route.post('/verify-forgot-otp', profileController.verifyForgotOTP);
user_route.post('/reset-password', profileController.resetPassword);


user_route.get('/',userController.loadHome);

user_route.get('/product',userController.loadShop);

user_route.get('/myaccount',userController.loadMyAccount)

user_route.get('/about',userController.loadAbout);

user_route.get('/contact',userController.loadContact)

module.exports = user_route;