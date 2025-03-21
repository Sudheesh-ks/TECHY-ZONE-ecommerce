const razorpayInstance = require('../config/razorpayConfig');
const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Wishlist = require('../models/wishlistModel');
const Wallet = require('../models/walletModel');
const Coupon = require('../models/couponModel');
const bcrypt = require('bcrypt');
const { generateOTP, sendOTP } = require('../utils/otp');
const { storeOTP, verifyOTP } = require('../utils/otpStorage');
const productModel = require('../models/productModel');
const pdf = require('html-pdf');
const PDFDocument = require("pdfkit");
const crypto = require('crypto');


const saltRounds = 10;

const loadRegister = async (req, res) => {
    try {

        res.render('users/registration');

    } catch (error) {
        console.log(error.message);

    }
}


const generateReferralCode = () => crypto.randomBytes(3).toString('hex').toUpperCase();  // Generating a random referral code


const insertUser = async (req, res,next) => {
    const { name, email, phno, password, referralCode } = req.body;
    try {

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ val: false, msg: 'Email address already exist' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);  // Hashing the password

        req.session.tempUserData = { name, email, phno, password: hashedPassword, referralCode };  // Storing user data in session for OTP verification
        const otp = generateOTP();  // Generating OTP
        console.log(otp);
        
        storeOTP(email, otp);  // Storing OTP in session
        await sendOTP(email, otp);
        console.log("into next middlwdf")
        return res.status(200).json({ val: true, msg:null });
    } catch (error) {
        console.log("Error during OTP generation:", error.message);
       return res.status(500).json({ val: false, msg: error })
    }
};


const loadOTPVerification = async (req, res) => {
    console.log(req.session.tempUserData)
    if(!req.session.user){
        const { email } =  req.session.tempUserData;  // Accessing user data from session
        res.render('users/otp-verification', { email });
    }else{
        res.redirect('/');
    }
   
};




const verifyOTPController = async (req, res) => {
    const { otp } = req.body;
    const { name, email, phno, password, referralCode } = req.session.tempUserData;

    const isVerified = verifyOTP(email, otp);  // Verifying OTP
    if (isVerified) {
        try {
            let referrer = null;

            if (referralCode) {   // Checking if avalid referral code is provided
                referrer = await User.findOne({ referralCode });
                if (referrer) {
                    console.log(`Referrer found: ${referrer.name}, ID: ${referrer._id}`);
                    
                    let referrerWallet = await Wallet.findOne({ userId: referrer._id });  // creating the wallet for the referrer
                    if (!referrerWallet) {
                        referrerWallet = new Wallet({ userId: referrer._id, balance: 0 });
                    }

                    const creditAmount = 100;  // setting ₹100 for referral bonus
                    referrerWallet.balance += creditAmount; // Adding ₹100 to wallet
                    referrerWallet.transactions.push({
                        amount: creditAmount,
                        type: 'Credit',
                        description: 'Referral bonus credited for referring a new user.'
                    });

                    await referrerWallet.save();
                    console.log(`Wallet successfully credited for ${referrer.name}`);
                } else {
                    console.log("Invalid referral code. No referrer found.");
                }
            }

            const newReferralCode = generateReferralCode();  // Generating a new referral code

            const user = new User({  // Creating a new user
                name,
                email,
                phno,
                password,
                referralCode: newReferralCode,
                referredBy: referrer ? referrer._id : null 
            });

            const userDataSaved = await user.save();

            const newUserWallet = new Wallet({ userId: user._id, balance: 0 });  // Creating a new wallet for the user
            await newUserWallet.save();

            delete req.session.tempUserData; // Removing user data from session

            req.session.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin
            };

            if (userDataSaved) {
                res.redirect('/');
            } else {
                res.redirect('/users/otp-verification');
            }
        } catch (error) {
            console.error("Error during user storage:", error.message);
            res.render('users/otp-verification', { message: "Error storing user data.", email });
        }
    } else {
        res.render('users/otp-verification', { message: "Invalid or expired OTP. Please try again.", email });
    }
};



const resendOtp = async (req, res) => {

    try {

        const otp1 = generateOTP();  // Generating OTP
        console.log(otp1);
        
        req.session.userOtp = otp1;  // Storing OTP in session
        const email = req.session.email;
        console.log("Resending OTP:", otp1);
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp1);
        if (emailSent) {
            console.log("Resent OTP:", otp1);
            res.status(200).json({ success: true, message: "Resend OTP Successful" });

        }


    } catch (error) {
        console.log("Error in resend otp", error);
        res.status(500).json({ success: 'Internal Server Error' });

    }
}


const loadLogin = async (req, res) => {
    try {

        res.render('users/login',{message: null});

    } catch (error) {
        console.log(error.message);

    }
}


const login = async (req, res) => {
    const { email, password } = req.body;
    console.log(email, password)
    try {
        const user = await User.findOne({ email });  // Finding user

        if (user) {

            if (user.isBlocked) {  // Checking if user is blocked
                return res.render('users/user-ban', { message: "Your account has been banned. Please contact support." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);  // Comparing password

            if (isPasswordValid) {

                req.session.user = {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    isAdmin:user.isAdmin
                };

                res.redirect('/');
            } else {
                // req.flash('error', 'Incorrect password. Please try again.');
                res.render('users/login',{message: "Invalid Credentials. Please try again."});
            }
        } else {
            req.flash('error', 'No account found with this email.');
            res.redirect('/login');
        }
    } catch (error) {
        console.log("Error during login:", error.message);
        res.render('users/login', { message: "An error occurred during login" });
    }
}



const loadHome = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });
        const { category, priceRange, sortBy, search } = req.query;

        let filter = { isDeleted: false };  // Default filter


        const listedCategoryIds = categories.map(cat => cat._id);  // List of category IDs

        if (category && category !== 'All Categories') {
            const selectedCategory = await Category.findOne({ name: category, isListed: true });  // Finding selected category
            if (selectedCategory) filter.category = selectedCategory._id;
        } else {
            filter.category = { $in: listedCategoryIds };
        }
        
        if (category && category !== 'All Categories') {
            const selectedCategory = await Category.findOne({ name: category });  
            if (selectedCategory) filter.category = selectedCategory._id;
        }

        
        if (priceRange) {  // Filtering through specific price range
            const [min, max] = priceRange.split('-').map(Number);
            filter.price = max ? { $gte: min, $lte: max } : { $gte: min };
        }

        
        if (search) {  // Filtering through search query
            filter.name = { $regex: search, $options: 'i' };
        }

        let productData = await Product.find(filter);  // Finding products

        
        if (sortBy) {
            switch (sortBy) {  // Sorting based on selected option
                case 'popularity':
                    productData.sort((a, b) => b.popularity - a.popularity);
                    break;
                case 'average-rating':
                    productData.sort((a, b) => b.rating - a.rating);
                    break;
                case 'latest':
                    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'price-low-to-high':
                    productData.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high-to-low':
                    productData.sort((a, b) => b.price - a.price);
                    break;
                default:
                    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
            }
        } else {
            
            productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        
        productData = productData.slice(0, 8);  // Limiting to 8

        let cart = null;
            if (req.session.user) {
                cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');  // Finding cart
            }

        
        res.render('users/index', {
            user: req.session.user,
            categories,
            sortBy,
            search,
            selectedCategory: category,
            priceRange,
            products: productData,
            cart
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};




const loadShop = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });  // Finding categories
        const { category, priceRange, sortBy, search, page = 1, limit = 16 } = req.query;  // Destructuring query parameters

        let filter = { isDeleted: false };


        const listedCategoryIds = categories.map(cat => cat._id);  // List of category IDs

        if (category && category !== 'All Categories') {
            const selectedCategory = await Category.findOne({ name: category, isListed: true });
            if (selectedCategory) filter.category = selectedCategory._id;
        } else {
            filter.category = { $in: listedCategoryIds };
        }
        
        if (category && category !== 'All Categories') {
            const selectedCategory = await Category.findOne({ name: category });
            if (selectedCategory) filter.category = selectedCategory._id;
        }

       
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            filter.price = max ? { $gte: min, $lte: max } : { $gte: min };
        }

        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        const totalProducts = await Product.countDocuments(filter);

        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);
        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        let productData = await Product.find(filter)
        .skip((currentPage - 1) * itemsPerPage)
        .limit(itemsPerPage)

        
        if (sortBy) {
            switch (sortBy) {
                case 'popularity':
                    productData.sort((a, b) => b.popularity - a.popularity);
                    break;
                case 'average-rating':
                    productData.sort((a, b) => b.rating - a.rating);
                    break;
                case 'latest':
                    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'price-low-to-high':
                    productData.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high-to-low':
                    productData.sort((a, b) => b.price - a.price);
                    break;
                default:
                    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }
        } else {
            
            productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        
        productData = productData.slice(0, 16);

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        
        res.render('users/product', {
            user: req.session.user,
            categories,
            sortBy,
            search,
            selectedCategory: category,
            priceRange,
            products: productData,
            currentPage,
            totalPages,
            cart,
        });

    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server Error');
    }
};


const loadProductDetail = async (req, res) => {
    try {
        const { productId } = req.params;

        
        const product = await Product.findOne({ _id: productId });
        console.log(product)

        
        if (!product || product.isDeleted) {  // Checking if the product exists
            return res.status(404).render('users/product-detail', { product: null, msg: "Product not found" });
        }

        
        const relatedProducts = await Product.find({  // Finding related products
            category: product.category,
            _id: { $ne: productId },
        }).limit(8);

        let cart = null;  
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        
        return res.status(200).render('users/product-detail', {
            user: req.session.user,
            product,
            relatedProducts,
            msg: null,
            cart
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).render('users/product-detail', { product: null, msg: "Error loading product details" });
    }
};



const loadMyAccount = async (req, res) => {
    try {

        const userData = await User.findById(req.session.user.id);
        
        
        if (!userData) {
            req.flash('error', 'User not found. Please complete your profile.');
            return res.redirect('/updateprofile');
        }

        const addressData = await Address.find({ user: req.session.user.id });  // Find addresses for the user

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        const showPhoneField = !!userData.phno;   // Check if phone number is provided
        const isGoogleUser = userData.isGoogleAuth;   // Check if the user is a Google user

        res.render('users/myaccount',{user: req.session.user, userData, addressData, cart, showPhoneField, isGoogleUser});

    } catch (error) {
        console.log(error.message);

    }
}

const loadUpdateProfile = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            console.error('User not authenticated');
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const userData = await User.findById(userId);

        if (!userData) {
            console.error('User not found in database');
            return res.status(404).send('User not found');
        }

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/update-profile', { 
            user: req.session.user,
            userData,
            cart 
        });

    } catch (error) {
        console.error('Error in loadUpdateProfile:', error.message);
        res.status(500).send('Server Error');
    }
};

const updateProfile = async (req, res) => {
    try {
      
        if (!req.session.user || !req.session.user.id) {
            console.error('User not authenticated');
            return res.redirect('/login');
        }

      
        const { name, phno, password } = req.body;
        const userId = req.session.user.id;

       
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return res.status(404).send('User not found');
        }

       
        if (name) user.name = name;
        if (phno) user.phno = phno;

       
        if (password && password.trim().length > 0) {  // Check if password is provided and not empty
            user.password = await bcrypt.hash(password, 10);
        }

       
        await user.save();

        
        req.session.user.name = user.name;
        req.session.user.phno = user.phno;

        
        res.redirect('/myaccount');
    } catch (error) {
        console.error('Error during profile update:', error.message);
        res.status(500).send('Server Error');
    }
};


const loadOrdersList = async (req, res) => {
    try {
        const userId = req.session.user.id;

        let page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });

        const orders = await Order.find({ userId })  // Find orders for the user
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        if (!orders.length) {  // If no orders found
            return res.render('users/orders-list', {
                user: req.session.user,
                orders: [],
                currentPage: page,
                totalPages: Math.ceil(totalOrders / limit),
                cart: null,
                razorpayKey: process.env.RAZORPAY_KEY_ID,
                message: "No orders found. Start shopping now!",
            });
        }

        const productIds = orders.flatMap(order => order.products.map(item => item.productId));  

        const products = await Product.find({ _id: { $in: productIds } }).lean();  // Find products for the order
        const productMap = Object.fromEntries(products.map(product => [product._id.toString(), product]));

        for (let order of orders) {
            order.products.forEach(item => {
                item.productDetails = productMap[item.productId] || { name: "Product not found" };
            });

            const shippingAddress = await Address.findById(order.addressId).lean();  
            order.address = shippingAddress ? shippingAddress.address : "No address found";
        }

        const cart = req.session.user
            ? await Cart.findOne({ userId: req.session.user.id }).populate('items.productId').lean()
            : null;

        res.render('users/orders-list', {
            user: req.session.user,
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            cart,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).send('Internal Server Error');
    }
};




const orderListView = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orderId = req.params.id; 

        const order = await Order.findOne({ _id: orderId, userId }).lean();  // Find order for the user


        if (!order) {
            console.log(`Order with ID ${orderId} not found for the user`);
            return res.status(404).send('Order not found');
        }

        for (let item of order.products) {
            const product = await Product.findById(item.productId).lean();
            if (product) {
                item.productDetails = product;
            } else {
                console.log(`Product with ID ${item.productId} not found.`);
            }
        }

        const shippingAddress = order.address;

        res.render('users/order-listview', { user: req.session.user, order});
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error');
    }
};


const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orderId = req.params.id;
        const { reason } = req.body;

        const order = await Order.findOneAndUpdate(  // Update order status
            { _id: orderId, userId },
            { status: 'Cancelled', cancelReason: reason },
            { new: true }
        );

        if (!order) {
            console.log('Order not found or unauthorized attempt to cancel');
            return res.status(404).send({ message: 'Order not found' });
        }

        console.log(`Order ${orderId} cancelled successfully.`);
        console.log(`Order Details:`, order);

        for (let item of order.products) {  // Update stock for canceled order
            const product = await Product.findById(item.productId);
            if (product) {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { stock: item.quantity },
                });
                console.log(`Stock updated for product ${product.name}: +${item.quantity}`);
            } else {
                console.error(`Product with ID ${item.productId} not found.`);
            }
        }

        console.log(`Stock updated for canceled order ${orderId}.`);

        let refundAmount = 0;

        console.log(`Payment Method: ${order.paymentMethod}`);
        console.log(`Payment Status: ${order.paymentStatus}`);

        if (order.paymentMethod !== 'Cash on Delivery' && order.paymentStatus !== 'Pending') {  // Checking if refund is applicable
            refundAmount = order.totalPrice;
            console.log(`Refund Amount Calculated: ₹${refundAmount}`);

            const updatedWallet = await Wallet.findOneAndUpdate(  // Updating wallet
                { userId },
                {
                    $inc: { balance: refundAmount },
                    $push: {
                        transactions: {
                            amount: refundAmount,
                            type: 'Credit',
                            description: `Refund for cancelled order ${orderId}`,
                        },
                    },
                },
                { new: true, upsert: true }
            );

            if (updatedWallet) {
                console.log('Wallet successfully updated:', updatedWallet);
            } else {
                console.error('Failed to update wallet.');
            }
        } else {
            console.log('Refund not applicable due to payment method or status.');
        }

        console.log(`Refund of ₹${refundAmount} added to wallet for user ${userId}.`);
        res.json({
            success: true,
            message: 'Order cancelled successfully',
            refundAmount,
        });
    } catch (error) {
        console.error('Error cancelling order:', error.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



const requestReturn = async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body; 

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found.');
        }

        if (order.status !== 'Delivered') {
            return res.status(400).send('Only delivered orders can be returned.');
        }

        if (order.returnStatus !== 'Not Requested') {
            return res.status(400).send('Return request already exists.');
        }

        order.returnStatus = 'Requested';  // Update return status
        order.returnReason = reason || '';
        order.returnRequestedAt = new Date();
        await order.save();

        req.flash('success', 'Return request submitted successfully!');
        res.status(200).json({ message: 'Return request submitted successfully!' });
    } catch (error) {
        console.error('Error processing return request:', error);
        req.flash('error', 'An error occurred while processing the return request.');
        res.status(500).send('Internal server error.');
    }
};


const cancelProduct = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            console.log('User not logged in or session not set');
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userId = req.session.user.id;
        const { orderId, productId } = req.params;

        console.log('User ID from session:', userId);
        console.log('Order ID:', orderId);
        console.log('Product ID:', productId);

        const order = await Order.findOne({ _id: orderId, userId });

        if (!order) {
            console.log('Order not found or unauthorized attempt');
            return res.status(404).json({ message: 'Order not found or unauthorized attempt' });
        }

        console.log('Order found:', order);

        const productIndex = order.products.findIndex(p => p.productId.toString() === productId);
        console.log('Product index:', productIndex);

        if (productIndex === -1) {  // Product not found in order
            console.log('Product not found in order');
            return res.status(404).json({ message: 'Product not found in order' });
        }

        const canceledProduct = order.products[productIndex];
        const canceledProductPrice = canceledProduct.price * canceledProduct.quantity;

        order.products[productIndex].status = 'Cancelled';

        order.totalPrice -= canceledProductPrice;

        if (order.totalPrice < 0) {  // Handle negative total price
            console.log(`Total price became negative (${order.totalPrice}). Resetting to zero.`);
            order.totalPrice = 0;
        }

        await order.save();
        console.log('Order updated successfully:', order);

        const product = await Product.findById(productId);
        if (product) {
            console.log('Product found for stock update:', product);
            product.stock += canceledProduct.quantity;  // Increase stock
            await product.save();
            console.log('Product stock updated:', product);
        }

        if (order.paymentMethod !== 'Cash on Delivery') {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: canceledProductPrice,
                transactions: [
                    {
                        amount: canceledProductPrice,
                        type: 'Credit',
                        description: `Refund for cancelled product ${canceledProduct.name} in order ${orderId}`,
                    },
                ],
            });
        } else {
            wallet.balance += canceledProductPrice;  // Add refund to wallet
            wallet.transactions.push({
                amount: canceledProductPrice,
                type: 'Credit',
                description: `Refund for cancelled product ${canceledProduct.name} in order ${orderId}`,
            });
        }

        await wallet.save();
        console.log(`Refund of ₹${canceledProductPrice} added to wallet for user ${userId}.`);
        }

         const allProductsCancelled = order.products.every(p => p.status === 'Cancelled');  // Check if all products are cancelled

         if (allProductsCancelled) {
             order.status = 'Cancelled';
             await order.save();
             console.log(`Order ${orderId} has been fully cancelled.`);
         }

        res.status(200).json({ message: 'Product cancelled successfully, and wallet updated' });
    } catch (error) {
        console.error('Error cancelling product:', error.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



const requestProductReturn = async (req, res) => {
    try {
        const { orderId, productId } = req.params;
        const { reason } = req.body;

        console.log('Received orderId:', orderId);
        console.log('Received productId:', productId);
        console.log('Received reason:', reason);

        const order = await Order.findById(orderId);
        if (!order) {
            console.log('Order not found');
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) {
            console.log('Product not found in order');
            return res.status(404).json({ message: 'Product not found in order' });
        }

        if (product.returnStatus !== 'Not Requested') {
            console.log('Return request already exists or product is not eligible');
            return res.status(400).json({ message: 'Return request already exists for this product' });
        }

        product.returnStatus = 'Requested';
        product.returnReason = reason;
        product.returnRequestedAt = new Date();

        await order.save();
        console.log('Order updated successfully:', order);

        res.status(200).json({ message: 'Return request submitted successfully' });
    } catch (error) {
        console.error('Error processing product return request:', error.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



const loadMyAddress = async (req, res) => {
    try {
        
        if (!req.session.user || !req.session.user.id) {
            console.log("User session not found");
            return res.redirect('/login'); 
        }

        const userId = req.session.user.id;
        const userAddresses = await Address.findOne({ userId });

        const addresses = userAddresses ? userAddresses.address : [];

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/myaddress', {
            user: req.session.user,
            addresses,
            cart
        });
    } catch (error) {
        console.error("Error in loadMyAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};


const loadAddAddress = async (req, res) => {
    try {

        res.render('users/addAddress',{user: req.session.user});

    } catch (error) {
        console.log(error.message);

    }
}

const postAddAddress = async (req, res) => {
    try {
      if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
      }
  
      const userId = req.session.user.id;
      const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
  
      let userAddress = await Address.findOne({ userId });
  
      if (!userAddress) {
        userAddress = new Address({  // Create a new address for the user
          userId,
          address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
        });
      } else {
        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });  // Add address to existing user
      }
  
      await userAddress.save();
      res.redirect('/myaddress');
  
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Server Error');
    }
  };
  

  const editAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const userAddress = await Address.findOne({  // Finding user by ID
            userId,
            address: { $elemMatch: { _id: addressId } }
        });

        if (!userAddress) {
            console.log("Address not found");
            return res.redirect('/pagenotfound');
        }

        const addressData = userAddress.address.find(item => item._id.toString() === addressId.toString());  // Finding address by ID

        if (!addressData) {
            console.log("Specific address not found in user's address list");
            return res.redirect('/pagenotfound');
        }

        res.render('users/editAddress', {
            user: req.session.user,
            address: addressData
        });

    } catch (error) {
        console.error("Error in editAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};


const postEditAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const userAddress = await Address.findOne({  // Finding user by ID
            userId,
            address: { $elemMatch: { _id: addressId } }
        });

        if (!userAddress) {
            console.log("Address not found");
            return res.redirect('/pagenotfound');
        }    

        const addressData = userAddress.address.find(item => item._id.toString() === addressId.toString());  // Finding address by ID

        if (!addressData) {
            console.log("Specific address not found in user's address list");
            return res.redirect('/pagenotfound');
        }

        addressData.addressType = req.body.addressType;
        addressData.name = req.body.name;
        addressData.city = req.body.city;
        addressData.landMark = req.body.landMark;
        addressData.state = req.body.state;
        addressData.pincode = req.body.pincode;
        addressData.phone = req.body.phone;
        addressData.altPhone = req.body.altPhone;

        await userAddress.save();

        res.redirect('/myaddress');

    } catch (error) {
        console.error("Error in postEditAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};

const deleteAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const userAddress = await Address.findOne({
            userId,
            address: { $elemMatch: { _id: addressId } }
        }); 

        if (!userAddress) {
            console.log("Address not found");
            return res.redirect('/pagenotfound');
        }

        const addressData = userAddress.address.find(item => item._id.toString() === addressId.toString());

        if (!addressData) {
            console.log("Specific address not found in user's address list");
            return res.redirect('/pagenotfound');
        }

        const updatedAddress = userAddress.address.filter(item => item._id.toString() !== addressId.toString());
        userAddress.address = updatedAddress;

        await userAddress.save();

        res.redirect('/myaddress');

    } catch (error) {
        console.error("Error in deleteAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};


const loadWallet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { page = 1, limit = 5 } = req.query;

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');  // Finding cart for the user
        }

        const wallet = await Wallet.findOne({ userId });  // Finding wallet for the user

        const totalTransactions = wallet?.transactions.length || 0;  


        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);
        const totalPages = Math.ceil(totalTransactions / itemsPerPage);

        const transactions = wallet?.transactions.sort((a, b) => b.createdAt - a.createdAt).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || [];

        res.render('users/wallet', {
            user: req.session.user,
            walletBalance: wallet?.balance || 0,
            transactions,
            currentPage,
            totalPages,
            limit,
            cart
        });
    } catch (error) {
        console.error('Error loading wallet:', error.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};



const loadAbout = async (req, res) => {
    try {

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/about',{user: req.session.user, cart});

    } catch (error) {
        console.log(error.message);

    }
}


const loadContact = async (req, res) => {
    try {

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/contact',{user: req.session.user, cart});

    } catch (error) {
        console.log(error.message);

    }
}

const loadShoppingCart = async (req, res) => {
    try {
        const userId = req.session.user ? req.session.user.id : null;

        if (userId) {
        
            const cart = await Cart.findOne({ userId });

            if (!cart) {
                return res.render('users/shopping-cart', { cart: null });
            }

            return res.render('users/shopping-cart', { cart });
        } else {
            
            const cart = req.session.cart || { items: [], totalPrice: 0, totalQuantity: 0 };
            res.render('users/shopping-cart', { cart });
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/');
    }
};

const addToCart = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ success: false, message: 'Please log in to add items to your cart.' });
        }

        const userId = req.session.user.id;
        console.log(req.body)
        const { productId, quantity } = req.body;

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid product or quantity.' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        if (parsedQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock! Only ${product.stock} items available.`,
            });
        }

        
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                totalQuantity: 0,
                totalPrice: 0,
            });
        }

        
        const existingProductIndex = cart.items.findIndex(
            item => item.productId.toString() === productId.toString()
        );

        if (existingProductIndex >= 0) {

            const existingQuantity = cart.items[existingProductIndex].quantity;
            if (existingQuantity + parsedQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add ${product.stock - existingQuantity} more of this product to the cart.`,
                });
            }
          
            cart.items[existingProductIndex].quantity += parsedQuantity;
        } else {
           
            cart.items.push({
                productId: product._id,
                name: product.name,
                price: product.offerPrice,
                quantity: parsedQuantity,
                images: product.images[0] || 'default-image.jpg',
            });
        }

        
        cart.items = cart.items.filter(item => item.quantity > 0);

        
        cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

       
        await cart.save();

        return res.status(200).json({ success: true, message: 'Cart updated successfully.', cart });
    } catch (error) {
        console.error('Error in addToCart:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

const updateCartItemQuantity = async (req, res) => {
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {  // Checking if productId, quantity, and quantity are valid
        console.log('Invalid data received:', productId, quantity);
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    try {
        if (!req.session.user || !req.session.user.id) {  // Checking if user is authenticated
            console.log('User not authenticated');
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ userId: req.session.user.id });
        if (!cart) {
            console.log('Cart not found');
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const item = cart.items.find(item => item.productId.toString() === productId); // Finding the item in the cart
        if (!item) {
            console.log('Item not found in cart');
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        item.quantity = quantity;

        let totalQuantity = 0;
        let totalPrice = 0;
        cart.items.forEach(item => {
            totalQuantity += item.quantity;  // Updating total quantity
            totalPrice += item.price * item.quantity;
        });

        cart.totalQuantity = totalQuantity;
        cart.totalPrice = totalPrice.toFixed(2);

        await cart.save();

        console.log('Updated item quantity:', quantity);
        console.log('Updated total cart price:', totalPrice.toFixed(2));

        return res.json({ 
            success: true, 
            updatedPrice: (item.price * quantity).toFixed(2),
            totalCartPrice: totalPrice.toFixed(2)
        });
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};




const removeFromCart = async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await Cart.findOneAndUpdate(
            { userId: req.session.user.id },
            { $pull: { items: { productId } } },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        if (cart.items.length === 0) {
            await Cart.deleteOne({ _id: cart._id });
            return res.json({ 
                success: true, 
                message: 'Cart cleared successfully!', 
                totalPrice: 0 
            });
        }

        cart.totalPrice = cart.items.reduce((total, item) => {  // Updating total price
            return total + item.price * item.quantity;
        }, 0);

        await cart.save();

        res.json({ 
            success: true, 
            message: 'Product removed successfully!', 
            totalPrice: cart.totalPrice.toFixed(2) 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to remove product.' });
    }
};



const loadCheckout = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const userAddresses = await Address.findOne({ userId });
        const addresses = userAddresses ? userAddresses.address : [];
        const wallet = await Wallet.findOne({ userId }) || { balance: 0 };

        const productId = req.query.productId;
        const quantity = req.query.quantity;

        let appliedCoupon = req.session.appliedCoupon || null;
        let discount = 0;

        // Fetching available coupons
        const availableCoupons = await Coupon.find({  
            isActive: true,
        }).select('couponCode discount expiryDate');


        if (productId && quantity) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).send("Product not found");
            }

            const checkoutProduct = {
                _id: product._id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image: product.images[0] || 'default-image.jpg',
                total: product.price * parseInt(quantity)
            };

            if (appliedCoupon) {
                discount = Math.min(
                    appliedCoupon.discount,
                    checkoutProduct.total
                );
                checkoutProduct.total -= discount;
            }

            const deliveryCharge = checkoutProduct.total < 500 ? 30 : 0;
            checkoutProduct.total += deliveryCharge;

            return res.render('users/checkout', {
                user: req.session.user,
                addresses,
                wallet,
                cart: null,
                product: checkoutProduct,
                appliedCoupon,
                discount,
                deliveryCharge,
                availableCoupons
            });
        }

        const cart = await Cart.findOne({ userId });

        if (cart && appliedCoupon) {
            discount = Math.min(
                appliedCoupon.discount,
                cart.totalPrice
            );
            cart.totalPrice -= discount;
        }

        const deliveryCharge = cart && cart.totalPrice < 500 ? 30 : 0;  // Adding delivery charge
        const totalPriceWithDelivery = (cart ? cart.totalPrice : 0) + deliveryCharge;  // Updating total price with delivery charge

        res.render('users/checkout', {
            user: req.session.user,
            addresses,
            wallet,
            cart: cart || { items: [], totalPrice: 0, totalQuantity: 0 },
            product: null,
            appliedCoupon,
            discount,
            deliveryCharge,
            totalPriceWithDelivery,
            availableCoupons
        });
    } catch (error) {
        console.error('Error in loading checkout:', error.message, error);
        res.status(500).send('Internal Server Error');
    }
};



const addCheckoutAddress = async (req, res) => {
    try {

        res.render('users/addCheckoutAddress',{user: req.session.user});

    } catch (error) {
        console.log(error.message);

    }
}


const postAddCheckoutAddress = async (req, res) => {
    try {
      if (!req.session.user || !req.session.user.id) {
        return res.status(401).send('User not logged in');
      }
  
      const userId = req.session.user.id;
      const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
  
      let userAddress = await Address.findOne({ userId });
  
      if (!userAddress) {
        userAddress = new Address({
          userId,
          address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
        });
      } else {
        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
      }
  
      await userAddress.save();
      res.redirect('/checkout');
  
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Server Error');
    }
  };


  const editCheckoutAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const userAddress = await Address.findOne({
            userId,
            address: { $elemMatch: { _id: addressId } }
        });

        if (!userAddress) {
            console.log("Address not found");
            return res.redirect('/pagenotfound');
        }

        const addressData = userAddress.address.find(item => item._id.toString() === addressId.toString());

        if (!addressData) {
            console.log("Specific address not found in user's address list");
            return res.redirect('/pagenotfound');
        }

        res.render('users/editCheckoutAddress', {
            user: req.session.user,
            address: addressData
        });

    } catch (error) {
        console.error("Error in editAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};


const postEditCheckoutAddress = async (req, res) => {
    try {
        const addressId = req.query.id;

        if (!req.session.user || !req.session.user.id) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const userAddress = await Address.findOne({
            userId,
            address: { $elemMatch: { _id: addressId } }
        });

        if (!userAddress) {
            console.log("Address not found");
            return res.redirect('/pagenotfound');
        }    

        const addressData = userAddress.address.find(item => item._id.toString() === addressId.toString());

        if (!addressData) {
            console.log("Specific address not found in user's address list");
            return res.redirect('/pagenotfound');
        }

        addressData.addressType = req.body.addressType;
        addressData.name = req.body.name;
        addressData.city = req.body.city;
        addressData.landMark = req.body.landMark;
        addressData.state = req.body.state;
        addressData.pincode = req.body.pincode;
        addressData.phone = req.body.phone;
        addressData.altPhone = req.body.altPhone;

        await userAddress.save();

        res.redirect('/checkout');

    } catch (error) {
        console.error("Error in postEditAddress:", error.message);
        res.status(500).send('Internal Server Error');
    }
};



const loadOrderConfirmation = async (req, res) => {
    try {
        const orderId = req.params.orderId; 
        const order = await Order.findById(orderId); 

        if (!order) {
            return res.status(404).send('Order not found.');
        }

        res.render('users/order-confirmation', {
            user: req.session.user,
            order,
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
};


// const downloadInvoice = async (req, res) => {
//     try {
//         const { orderId } = req.params; 

//         const order = await Order.findById(orderId)
//             .populate('userId', 'name email') 
//             .select('userId products paymentMethod deliveryCharge totalPrice discountAmount createdAt');

//         if (!order) {
//             return res.status(404).send('Order not found.');
//         }
//         // HTML desing for the invoice
//         const html = `
//             <html>
//             <head>
//                 <style>
//                     body { font-family: Arial, sans-serif; margin: 20px; }
//                     .container { width: 100%; }
//                     .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
//                     th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
//                     th { background-color: #f4f4f4; }
//                     .total-row { font-weight: bold; text-align: right; padding-top: 15px; }
//                     .footer { margin-top: 30px; text-align: center; font-size: 0.9em; }
//                 </style>
//             </head>
//             <body>
//                 <h2 style="text-align: center;">Invoice</h2>
//                 <p><strong>Order ID:</strong> #${order._id.toString().slice(-6)}</p>
//                 <p><strong>Order Date:</strong> ${order.createdAt.toISOString().split('T')[0]}</p>
//                 <p><strong>Customer Name:</strong> ${order.userId ? order.userId.name : 'N/A'}</p>
//                 <p><strong>Email:</strong> ${order.userId ? order.userId.email : 'N/A'}</p>

//                 <h3 style="margin-top: 20px;">Order Details</h3>
//                 <table class="table">
//                     <thead>
//                         <tr>
//                             <th>Product Name</th>
//                             <th>Quantity</th>
//                             <th>Payment Method</th>
//                             <th>Price (₹)</th>
//                             <th>Discount (₹)</th>
//                             <th>Total (₹)</th>
//                             <th>Delivery Charge (₹)</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         ${order.products.map(product => `
//                             <tr>
//                                 <td>${product.name}</td>
//                                 <td>${product.quantity}</td>
//                                 <td>${order.paymentMethod}</td>
//                                 <td>₹${product.price.toFixed(2)}</td>
//                                 <td>₹${order.discountAmount.toFixed(2)}</td>
//                                 <td>₹${(product.price * product.quantity - order.discountAmount).toFixed(2)}</td>
//                                 <td>${order.deliveryCharge}</td>
//                             </tr>
//                         `).join('')}
//                     </tbody>
//                 </table>

//                 <div class="total-row">
//                     <span>Total Amount:</span> ₹${order.totalPrice.toFixed(2)}
//                 </div>

//                 <div class="footer">
//                     <p>Thank you for your purchase!</p>
//                 </div>
//             </body>
//             </html>
//         `;

//         pdf.create(html, { format: 'A4' }).toStream((err, stream) => {
//             if (err) {
//                 console.error('Error generating PDF:', err.message);
//                 return res.status(500).send('An error occurred while generating the PDF.');
//             }
//             res.setHeader('Content-Disposition', 'attachment; filename=invoice.pdf');
//             res.setHeader('Content-Type', 'application/pdf');
//             stream.pipe(res);
//         });
//     } catch (error) {
//         console.error('Error exporting invoice data to PDF:', error.message);
//         res.status(500).send('An error occurred while exporting the invoice data.');
//     }
// };


const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .select('userId products paymentMethod deliveryCharge totalPrice discountAmount createdAt');

        if (!order) {
            return res.status(404).send("Order not found.");
        }

        const doc = new PDFDocument({ margin: 50 });
        const filename = `Invoice_${orderId}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/pdf');

        doc.pipe(res);

        addHeader(doc, order);
        addTable(doc, order.products, order.discountAmount);
        addSummary(doc, order.deliveryCharge, order.totalPrice);
        addFooter(doc);

        doc.end();
    } catch (error) {
        console.error("Error generating invoice PDF:", error.message);
        res.status(500).send("An error occurred while generating the invoice PDF.");
    }
};

const addHeader = (doc, order) => {
    doc
        .fontSize(20)
        .text("Invoice", { align: "center" })
        .moveDown();

    doc
        .fontSize(12)
        .text(`Order ID: ${order._id.toString().slice(-6)}`)
        .text(`Order Date: ${order.createdAt.toISOString().split('T')[0]}`)
        .text(`Customer Name: ${order.userId ? order.userId.name : "N/A"}`)
        .text(`Email: ${order.userId ? order.userId.email : "N/A"}`)
        .moveDown();

    doc
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke()
        .moveDown(1);
};

const addTable = (doc, products, discountAmount) => {
    const tableTop = doc.y;

    // Table headers
    doc
        .fontSize(10)
        .text("Product Name", 50, tableTop, { bold: true })
        .text("Quantity", 200, tableTop, { bold: true })
        .text("Price (₹)", 300, tableTop, { bold: true })
        .text("Discount (₹)", 400, tableTop, { bold: true })
        .text("Total (₹)", 500, tableTop, { bold: true });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Table rows
    let currentY = tableTop + 25;
    products.forEach((product) => {
        const total = product.quantity * product.price - (discountAmount || 0);
        doc
            .fontSize(10)
            .text(product.name, 50, currentY)
            .text(product.quantity, 200, currentY)
            .text(`₹${product.price.toFixed(2)}`, 300, currentY)
            .text(`₹${(discountAmount || 0).toFixed(2)}`, 400, currentY)
            .text(`₹${total.toFixed(2)}`, 500, currentY);

        currentY += 20;
    });
};

// Function to add the summary section
const addSummary = (doc, deliveryCharge, totalPrice) => {
    doc
        .moveDown(2)
        .fontSize(12)
        .text(`Delivery Charge: ₹${deliveryCharge.toFixed(2)}`, { align: "right" })
        .text(`Total Amount: ₹${totalPrice.toFixed(2)}`, { align: "right", bold: true });
};

// Function to add the footer
const addFooter = (doc) => {
    doc
        .moveDown(2)
        .fontSize(10)
        .text("Thank you for your purchase!", { align: "center" });
};

const loadWishlist = async (req, res) => {
    try {

        console.log("Start: loadWishlist controller");

        if (!req.session.user) {
            console.log("User not logged in");
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        console.log("User ID:", userId);

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId', 'name description price offerPrice images stock');
        console.log("Wishlist loaded:", wishlist);

        res.render('users/wishlist', {
            user: req.session.user,
            wishlist: wishlist ? wishlist.products : [],
            cart  
        });

        
    } catch (error) {
        console.error("Error in loadWishlist:", error.message);
        res.status(500).render('users/wishlist', {
            user: req.session.user,
            message: "Failed to load wishlist. Please try again.",
        });
    }
};




const addToWishlist = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "User not logged in" });
        }

        const userId = req.session.user.id;
        const productId = req.body.productId;
        
        
        let wishlist = await Wishlist.findOne({ userId });

        console.log(wishlist);

        if (!wishlist) {
        
            wishlist = new Wishlist({
                userId,
                products: [{ productId }]
            });
        } else {
         
            const productExists = wishlist.products.some(item => item.productId.toString() === productId);
            if (productExists) {
                return res.status(400).json({ success: false, message: "Product already in wishlist" });
            }

           
            wishlist.products.push({ productId });
        }

   
        await wishlist.save();
        res.status(200).json({ success: true, message: "Product added to wishlist" });
    } catch (error) {
        console.error("Error in addToWishlist:", error);
        res.status(500).json({ success: false, message: "Failed to add product to wishlist" });
    }
};



const addToCartFromWishlist = async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.id) {
            return res.status(401).json({ success: false, message: 'Please log in to add items to your cart.' });
        }

        const userId = req.session.user.id;
        const { productId, quantity = 1 } = req.body;

        const parsedQuantity = parseInt(quantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ success: false, message: 'Invalid product or quantity.' });
        }

  
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }

        if (parsedQuantity > product.stock) {  // Checking if the requested quantity exceeds stock
            return res.status(400).json({
                success: false,
                message: `Insufficient stock! Only ${product.stock} items available.`,
            });
        }

        
        let cart = await Cart.findOne({ userId });
        if (!cart) {
            cart = new Cart({
                userId,
                items: [],
                totalQuantity: 0,
                totalPrice: 0,
            });
        }

       
        const existingProductIndex = cart.items.findIndex(  // Checking if the product is already in the cart
            item => item.productId.toString() === productId.toString()
        );

        if (existingProductIndex >= 0) {
            const existingQuantity = cart.items[existingProductIndex].quantity;  // Quantity of the existing product

            if (existingQuantity + parsedQuantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `You can only add ${product.stock - existingQuantity} more of this product to the cart.`,
                });
            }

            
            cart.items[existingProductIndex].quantity += parsedQuantity;  // Updating the quantity
        } else {
          
            cart.items.push({
                productId: product._id,
                name: product.name,
                price: product.offerPrice || product.price,
                quantity: parsedQuantity,
                images: product.images[0] || 'default-image.jpg',
            });
        }

      
        cart.items = cart.items.filter(item => item.quantity > 0);  // Removing empty items

        cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);  // Calculating total price

        await cart.save();

        return res.status(200).json({ success: true, message: 'Product added to cart successfully.', cart });
    } catch (error) {
        console.error('Error in addToCartFromWishlist:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};





const removeFromWishlist = async (req, res) => {
    try {

        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const userId = req.session.user.id;
        const { productId } = req.body;

        console.log(userId);
        console.log(productId);

        const wishlist = await Wishlist.findOne({ userId });

        if (wishlist) {
            wishlist.products = wishlist.products.filter(
                (item) => !item.productId.equals(productId)
            );

            await wishlist.save();

            res.json({ success: true, message: 'Product removed from wishlist' });
        } else {
            res.status(404).json({ success: false, message: 'Wishlist not found' });
        }
    } catch (error) {
        console.error("Error in removeFromWishlist:", error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const logout = (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/login');
        });
    } catch (error) {
        console.error('Logout Error:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


module.exports = {
    loadRegister,
    insertUser,
    loadLogin,
    login,
    loadOTPVerification,
    verifyOTPController,
    resendOtp,
    loadHome,
    loadProductDetail,
    loadShop,
    loadMyAccount,
    loadUpdateProfile,
    updateProfile,
    loadOrdersList,
    orderListView,
    cancelOrder,
    requestReturn,
    cancelProduct,
    requestProductReturn,
    loadMyAddress,
    loadAddAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress,
    loadWallet,
    loadAbout,
    loadContact,
    loadShoppingCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    loadCheckout,
    addCheckoutAddress,
    postAddCheckoutAddress,
    editCheckoutAddress,
    postEditCheckoutAddress,
    loadOrderConfirmation,
    downloadInvoice,
    loadWishlist,
    addToWishlist,
    addToCartFromWishlist,
    removeFromWishlist,
    logout
}