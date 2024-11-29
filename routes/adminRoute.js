const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const customerController = require('../controllers/customerController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const couponController = require('../controllers/couponController');
const {isLogin,isAuthenticated} = require('../middlewares/adminAuth');



const upload = require('../utils/multerConfig');

router.get('/pageerror',adminController.pageerror);
router.get('/login',isLogin,adminController.loadLogin);
router.post('/login', adminController.login);
router.get('/dashboard',isAuthenticated,adminController.loadDashboard);
router.get('/logout',isAuthenticated,adminController.logout);

// Customer Management
router.get('/users',isAuthenticated,customerController.customerInfo);
router.get('/blockCustomer',customerController.customerBlocked);
router.get('/unblockCustomer',customerController.customerunBlocked);

// Category Management
router.get('/category',isAuthenticated,categoryController.categoryInfo);
router.post('/addCategory', categoryController.addCategory);
router.post('/toggleListStatus/:id', categoryController.toggleListStatus);
router.post('/category/edit/:id', categoryController.editCategory); 

// Product Management
router.get('/addProducts',isAuthenticated,productController.getProductAddPage);
router.post('/products/add', upload.fields([
    { name: 'productImage1', maxCount: 1 },
    { name: 'productImage2', maxCount: 1 },
    { name: 'productImage3', maxCount: 1 },
  ]), productController.productsAdd);

router.get('/products',isAuthenticated,productController.getAllProducts);
router.get('/blockProduct',productController.blockProduct);
router.get('/unblockProduct',productController.unblockProduct);
router.get('/products/edit/:id', productController.getEditProductPage);


router.put(
  '/products/edit/:id', 
  upload.fields([
    { name: 'croppedImage1', maxCount: 1 },
    { name: 'croppedImage2', maxCount: 1 },
    { name: 'croppedImage3', maxCount: 1 }
  ]),
  productController.updateProduct
);


// Order Management
router.get('/orders',orderController.getAllOrders);
router.get('/order-detail/:id',orderController.loadOrderDetails);
router.post('/update-order-status/:id', orderController.updateOrderStatus);
router.post('/approve-return/:id', orderController.approveReturn);
router.post('/reject-return/:id', orderController.rejectReturn);

// Coupon Management
router.get('/coupon',couponController.loadCoupon);
router.get('/addCoupon',couponController.loadAddCoupon);
router.post('/add-coupon', couponController.addCoupon);
router.delete('/delete-coupon/:id', couponController.deleteCoupon);


module.exports = router;
