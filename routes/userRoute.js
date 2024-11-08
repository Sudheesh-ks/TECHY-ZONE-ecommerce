const express = require('express');
const user_route = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const profileController = require('../controllers/profileController');
const {isAuthenticated,isLogin} = require('../middlewares/authMiddleware');



user_route.get('/register',isLogin,userController.loadRegister);
user_route.post('/register',userController.insertUser);

user_route.get('/auth/google',isLogin,passport.authenticate('google',{scope:['profile','email']}));
user_route.get('/auth/google/callback',isLogin,passport.authenticate('google',{failureRedirect:'/register'}),(req,res) => {
    res.render('users/index')
});


user_route.get('/verify-otp', userController.loadOTPVerification);
user_route.post('/verify-otp', userController.verifyOTPController);

user_route.get('/login',isLogin,userController.loadLogin);
user_route.post('/login',userController.login);

user_route.get('/forgot-password', profileController.loadForgotPassword);
user_route.post('/forgot-password', profileController.forgotEmailValid);
user_route.post('/verify-forgot-otp', profileController.verifyForgotOTP);
user_route.post('/reset-password', profileController.resetPassword);


user_route.get('/',isAuthenticated,userController.loadHome);

user_route.get('/product',userController.loadShop);

user_route.get('/myaccount',userController.loadMyAccount)

user_route.get('/about',userController.loadAbout);

user_route.get('/contact',userController.loadContact)

module.exports = user_route;