const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
const categoryController = require('../controllers/categoryController');
const {userAuth,adminAuth} = require('../middlewares/auth');

// Login Management
router.get('/pageerror',adminController.pageerror);
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/dashboard', adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

// Customer Management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked);

// Category Management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory', categoryController.addCategory);
router.post('/toggleListStatus/:id', categoryController.toggleListStatus);
router.post('/category/edit/:id', categoryController.editCategory); 

// Product Management
router.get('/')




module.exports = router;
