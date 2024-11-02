const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController')
const {userAuth,adminAuth} = require('../middlewares/auth');

// Login Management
router.get('/pageerror',adminController.pageerror);
router.get('/login', adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/dashboard', adminAuth,adminController.loadDashboard);
router.get('/logout',adminController.logout);

// Customer Management
router.get('/users',adminAuth,customerController.customerInfo);



module.exports = router;
