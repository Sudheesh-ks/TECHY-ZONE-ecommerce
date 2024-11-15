const express = require('express');
const user_route = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const profileController = require('../controllers/profileController');
const { isUserAuthenticated, isUserLogin } = require('../middlewares/userAuth');
const { isLogin } = require('../middlewares/adminAuth');



// Register Management
user_route.get('/register',isUserLogin,userController.loadRegister);
user_route.post('/register',userController.insertUser);

user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res) => {
    req.session.user=true
    res.redirect('/')
});

user_route.get('/verify-otp', userController.loadOTPVerification);
user_route.post('/verify-otp', userController.verifyOTPController);
user_route.post('/verify-resendOtp',userController.resendOtp);

// Login Management
user_route.get('/login',userController.loadLogin);
user_route.post('/login',userController.login);


// Profile Management
user_route.get('/forgot-password', profileController.loadForgotPassword);
user_route.post('/forgot-email-valid', profileController.forgotEmailValid);
user_route.post('/verify-passForgot-otp', profileController.verifyForgotPassOTP);
user_route.post('/resend-forgot-otp',profileController.resendOtp);
user_route.get('/reset-password', profileController.resetPassword);
user_route.post('/reset-password',profileController.postNewPassword);


user_route.get('/',userController.loadHome);

user_route.get('/product-detail/:productId',userController.loadProductDetail);

user_route.get('/product',userController.loadShop);

user_route.get('/myaccount',userController.loadMyAccount);

user_route.get('/about',userController.loadAbout);

user_route.get('/contact',userController.loadContact);

module.exports = user_route;