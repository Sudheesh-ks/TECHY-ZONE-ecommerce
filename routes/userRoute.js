const express = require('express');
const user_route = express.Router();
const passport = require('passport');
const userController = require('../controllers/userController');
const profileController = require('../controllers/profileController');
const paymentController = require('../controllers/paymentController');
const couponController = require('../controllers/couponController');
const { isUserAuthenticated, isUserLogin } = require('../middlewares/userAuth');
const { isLogin } = require('../middlewares/adminAuth');



// Register Management
user_route.get('/register',isUserLogin,userController.loadRegister);
user_route.post('/register',userController.insertUser);

user_route.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
user_route.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/register'}),(req,res) => {
    req.session.user= true;
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

// Home Page Management
user_route.get('/',userController.loadHome);

// Shop Management
user_route.get('/product',userController.loadShop);
user_route.get('/product-detail/:productId',userController.loadProductDetail);

// User Profile Management
user_route.get('/myaccount',userController.loadMyAccount);
user_route.get('/updateprofile',userController.loadUpdateProfile);
user_route.post('/updateprofile',userController.updateProfile);
user_route.get('/orders-list',userController.loadOrdersList);
user_route.get('/order-listview/:id',userController.orderListView);
user_route.post('/order-cancel/:id', userController.cancelOrder);
user_route.post('/order-return/:orderId', userController.requestReturn);
// Route to cancel a product in an order
user_route.post('/product-cancel/:orderId/:productId',userController.cancelProduct);

// Route to request a return for a product in an order
user_route.post('/product-return/:orderId/:productId',userController.requestProductReturn);

user_route.get('/myaddress',userController.loadMyAddress);
user_route.get('/addaddress',userController.loadAddAddress);
user_route.post('/addaddress',userController.postAddAddress);
user_route.get('/editAddress',userController.editAddress);
user_route.post('/editAddress',userController.postEditAddress);
user_route.get('/deleteAddress',userController.deleteAddress);
user_route.get('/wallet',userController.loadWallet);

user_route.get('/about',userController.loadAbout);
user_route.get('/contact',userController.loadContact);
user_route.get('/shopping-cart',userController.loadShoppingCart);
user_route.put('/update-cart', userController.addToCart);
user_route.post('/cart/add', userController.addToCart);
user_route.post('/update-cartquantity', userController.updateCartItemQuantity);
user_route.delete('/cart/remove/:productId', userController.removeFromCart);

user_route.get('/checkout',userController.loadCheckout);
user_route.get('/addCheckoutAddress',userController.addCheckoutAddress);
user_route.post('/addCheckoutAddress',userController.postAddCheckoutAddress);
user_route.get('/editCheckoutAddress',userController.editCheckoutAddress);
user_route.post('/editCheckoutAddress',userController.postEditCheckoutAddress);
user_route.post('/place-order',paymentController.placeOrder);
user_route.post('/verify-payment',paymentController.verifyPayment);
user_route.get('/order-confirmation/:orderId',userController.loadOrderConfirmation);

user_route.get('/wishlist', userController.loadWishlist);
user_route.post('/wishlist/add', userController.addToWishlist);
user_route.post('/add-to-cart', userController.addToCartFromWishlist);
user_route.post('/wishlist/remove', userController.removeFromWishlist);

user_route.post('/apply-coupon', couponController.applyCoupon);
user_route.post('/remove-coupon', couponController.removeCoupon);


user_route.get('/logout', userController.logout);

module.exports = user_route;