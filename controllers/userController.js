const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const Address = require('../models/addressModel');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel');
const Wishlist = require('../models/wishlistModel');
const Wallet = require('../models/walletModel');
const bcrypt = require('bcrypt');
const { generateOTP, sendOTP } = require('../utils/otp');
const { storeOTP, verifyOTP } = require('../utils/otpStorage');
const productModel = require('../models/productModel');



const saltRounds = 10;

const loadRegister = async (req, res) => {
    try {

        res.render('users/registration');

    } catch (error) {
        console.log(error.message);

    }
}

const insertUser = async (req, res,next) => {
    const { name, email, phno, password } = req.body;
    try {

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({ val: false, msg: 'Email address already exist' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);
        req.session.tempUserData = { name, email, phno, password: hashedPassword };
        const otp = generateOTP();
        console.log(otp);
        
        storeOTP(email, otp);
        await sendOTP(email, otp);
        console.log("into next middlwdf")
        return res.status(200).json({ val: true, msg:null });
    } catch (error) {
        console.log("Error during OTP generation:", error.message);
       return res.status(500).json({ val: false, msg: error })
    }
};


const loadOTPVerification = async (req, res) => {
    console.log("heloo")
    console.log(req.session.tempUserData)
    if(!req.session.user){
        console.log("inside")
        const { email } =  req.session.tempUserData;
        res.render('users/otp-verification', { email });
    }else{
        res.redirect('/');
    }
   
};



const verifyOTPController = async (req, res) => {
    const { otp } = req.body;
    const { name, email, phno, password } = req.session.tempUserData;
    const isVerified = verifyOTP(email, otp);
    if (isVerified) {
        try {
            console.log(name, email, phno, password)
            const user = new User({
                name,
                email,
                phno,
                password
            });
            const userDataSaved = await user.save();
            delete req.session.tempUserData;
            req.session.user = {
                id: user._id,
                name: user.name,
                email: user.email,
                isAdmin:user.isAdmin
            };


            if (userDataSaved) {
                res.redirect('/');
            } else {
                res.redirect('/users/otp-verification');
            }
        } catch (error) {
            console.log("Error during user storage:", error.message);
            res.render('users/otp-verification', { message: "Error storing user data.", email });
        }
    } else {
        res.render('users/otp-verification', { message: "Invalid or expired OTP. Please try again.", email });
    }
};


const resendOtp = async (req, res) => {

    try {

        const otp1 = generateOTP();
        console.log(otp1);
        
        req.session.userOtp = otp1;
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
        const user = await User.findOne({ email });

        if (user) {

            if (user.isBlocked) {
                return res.render('users/user-ban', { message: "Your account has been banned. Please contact support." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

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

        let filter = { isDeleted: false };

        
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

        let productData = await Product.find(filter);

        
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

        
        productData = productData.slice(0, 8);

        let cart = null;
            if (req.session.user) {
                cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
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
        const categories = await Category.find({ isListed: true });
        const { category, priceRange, sortBy, search } = req.query;

        let filter = { isDeleted: false };

        
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

        let productData = await Product.find(filter);

        
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
                    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Default to latest sorting
            }
        } else {
            
            productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        
        productData = productData.slice(0, 8);

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
            cart
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

        
        if (!product || product.isDeleted) {
            return res.status(404).render('users/product-detail', { product: null, msg: "Product not found" });
        }

        
        const relatedProducts = await Product.find({
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
        
        
        const addressData = await Address.find({ user: req.session.user.id });

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/myaccount',{user: req.session.user, userData, addressData, cart});

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

       
        if (password && password.trim().length > 0) {
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

       
        const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();
        
        
        if (!orders || orders.length === 0) {
            console.log('No orders found for the user');
            return res.render('users/orders-list', { user: req.session.user, orders: [] });
        }

        
        for (let order of orders) {
            
            for (let item of order.products) {
                const product = await Product.findById(item.productId).lean();
                if (product) {
                    item.productDetails = product; 
                } else {
                    console.log(`Product with ID ${item.productId} not found.`);
                }
            }

            
            const shippingAddress = await Address.findOne({ userId }).lean();
            if (shippingAddress) {
                order.address = shippingAddress.address;  
            } else {
                console.log('Shipping address not found for user');
            }
        }

        let cart = null;
        if (req.session.user) {
            cart = await Cart.findOne({ userId: req.session.user.id }).populate('items.productId');
        }

        res.render('users/orders-list', { user: req.session.user, orders, cart });
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


const orderListView = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orderId = req.params.id; 

        const order = await Order.findOne({ _id: orderId, userId }).lean();


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

        res.render('users/order-listView', { user: req.session.user, order});
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Server error');
    }
};


const cancelOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const orderId = req.params.id;

        // Find and update the order to set its status to 'Cancelled'
        const order = await Order.findOneAndUpdate(
            { _id: orderId, userId },
            { status: 'Cancelled' },
            { new: true }
        );

        if (!order) {
            console.log('Order not found or unauthorized attempt to cancel');
            return res.status(404).send({ message: 'Order not found' });
        }

        console.log(`Order ${orderId} cancelled successfully.`);

        // Refund the amount to the wallet
        const refundAmount = order.totalPrice;

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            // Create a new wallet for the user if it doesn't exist
            wallet = new Wallet({
                userId,
                balance: refundAmount,
                transactions: [
                    {
                        amount: refundAmount,
                        type: 'Credit',
                        description: `Refund for cancelled order ${orderId}`,
                    },
                ],
            });
        } else {
            // Update wallet balance and add transaction
            wallet.balance += refundAmount;
            wallet.transactions.push({
                amount: refundAmount,
                type: 'Credit',
                description: `Refund for cancelled order ${orderId}`,
            });
        }

        await wallet.save();

        console.log(`Refund of ₹${refundAmount} added to wallet for user ${userId}.`);
        res.redirect('/orders-list');
    } catch (error) {
        console.error('Error cancelling order:', error.message);
        res.status(500).send({ message: 'Internal Server Error' });
    }
};


const requestReturn = async (req, res) => {
    const { orderId } = req.params;
    const { reason } = req.body; // Reason for return from form input

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found.');
        }

        // Check if the order is delivered and return has not been requested
        if (order.status !== 'Delivered') {
            return res.status(400).send('Only delivered orders can be returned.');
        }

        if (order.returnStatus !== 'Not Requested') {
            return res.status(400).send('Return request already exists.');
        }

        // Update the order's return status, reason, and other fields
        order.returnStatus = 'Requested';
        order.returnReason = reason || '';
        order.returnRequestedAt = new Date();
        await order.save();

        // Redirect back to the order list with a success message
        req.flash('success', 'Return request submitted successfully!');
        res.status(200).json({ message: 'Return request submitted successfully!' });
    } catch (error) {
        console.error('Error processing return request:', error);
        req.flash('error', 'An error occurred while processing the return request.');
        res.status(500).send('Internal server error.');
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

        res.render('users/myaddress', {
            user: req.session.user,
            addresses
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
        userAddress = new Address({
          userId,
          address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }],
        });
      } else {
        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
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
        const wallet = await Wallet.findOne({ userId });

        res.render('users/wallet', {
            user: req.session.user,
            walletBalance: wallet?.balance || 0,
            transactions: wallet?.transactions || [], // Pass transactions to view if needed
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
            return res.json({ success: true, message: 'Cart cleared successfully!' });
        }

        res.json({ success: true});
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

        const productId = req.query.productId;
        const quantity = req.query.quantity;

        let appliedCoupon = req.session.appliedCoupon || null;
        let discount = 0;

        // Handle single product checkout
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

            // Apply coupon discount to single product checkout
            if (appliedCoupon) {
                discount = Math.min(
                    appliedCoupon.discount,
                    checkoutProduct.total
                ); // Ensure discount does not exceed total
                checkoutProduct.total -= discount;
            }

            return res.render('users/checkout', {
                user: req.session.user,
                addresses,
                cart: null,
                product: checkoutProduct,
                appliedCoupon,
                discount
            });
        }

        // Handle cart checkout
        const cart = await Cart.findOne({ userId });

        if (cart && appliedCoupon) {
            discount = Math.min(
                appliedCoupon.discount,
                cart.totalPrice
            ); // Ensure discount does not exceed total
            cart.totalPrice -= discount;
        }

        res.render('users/checkout', {
            user: req.session.user,
            addresses,
            cart: cart || { items: [], totalPrice: 0, totalQuantity: 0 },
            product: null,
            appliedCoupon,
            discount
        });
    } catch (error) {
        console.error(error.message);
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


// const placeOrder = async (req, res) => {
//     try {
//         const { addressId, paymentMethod } = req.body;

//         if (paymentMethod !== 'Cash on Delivery') {
//             return res.status(400).send('Only Cash on Delivery is supported.');
//         }

//         if (!addressId) {
//             return res.status(400).send('Address is required.');
//         }

//         const userId = req.session.user.id;

        
//         const userAddresses = await Address.findOne({ userId });
//         const selectedAddress = userAddresses.address.find(addr => addr._id.toString() === addressId);
//         if (!selectedAddress) {
//             return res.status(404).send('Address not found.');
//         }


//         const { productId, quantity } = req.query;

//         let orderProducts = [];
//         let totalPrice = 0;

//         if (productId && quantity) {
                
            
//             const product = await Product.findById(productId);
//             if (!product) {
//                 return res.status(404).send('Product not found.');
//             }

//             orderProducts.push({
//                 productId: product._id,
//                 name: product.name,
//                 price: product.price,
//                 quantity: parseInt(quantity),
//                 image: product.images[0] || 'default-image.jpg'
//             });

//             totalPrice = product.price * quantity;
//         } else {

//             const cart = await Cart.findOne({ userId });
//             if (!cart || cart.items.length === 0) {
//                 return res.status(400).send('Your cart is empty.');
//             }

//             orderProducts = cart.items.map(item => ({
//                 productId: item.productId,
//                 name: item.name,
//                 price: item.price,
//                 quantity: item.quantity,
//                 image: item.images
//             }));

//             totalPrice = cart.totalPrice;
//         }

//         const order = new Order({
//             userId,
//             products: orderProducts,
//             totalPrice,
//             address: selectedAddress,
//             paymentMethod,
//             paymentStatus: 'Pending',
//             status: 'Pending'
//         });

//         await order.save();

//          // Code for update stock 
//          for (const item of orderProducts) {
//             const product = await Product.findById(item.productId);
//             if (product) {
//                 if (product.stock < item.quantity) {
//                     return res.status(400).send(`Insufficient stock for ${product.name}.`);
//                 }
//                 product.stock -= item.quantity; 
//                 await product.save();
//             }
//         }

//         if (!productId) {
//             await Cart.deleteOne({ userId });
//         }

//         res.redirect(`/order-confirmation/${order._id}`);
//     } catch (error) {
//         console.error(error.message);
//         res.status(500).send('Internal Server Error');
//     }
// };

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


const loadWishlist = async (req, res) => {
    try {
        console.log("Start: loadWishlist controller");

        if (!req.session.user) {
            console.log("User not logged in");
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        console.log("User ID:", userId);

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId', 'name description price offerPrice images stock');
        console.log("Wishlist loaded:", wishlist);

        res.render('users/wishlist', {
            user: req.session.user,
            wishlist: wishlist ? wishlist.products : [],  
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
                price: product.offerPrice || product.price,
                quantity: parsedQuantity,
                images: product.images[0] || 'default-image.jpg',
            });
        }

      
        cart.items = cart.items.filter(item => item.quantity > 0);

        cart.totalQuantity = cart.items.reduce((total, item) => total + item.quantity, 0);
        cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

        await cart.save();

        return res.status(200).json({ success: true, message: 'Product added to cart successfully.', cart });
    } catch (error) {
        console.error('Error in addToCartFromWishlist:', error.message);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};





const removeFromWishlist = async (req, res) => {
    try {
        console.log("Start: removeFromWishlist controller");

        if (!req.session.user) {
            console.log("User not logged in");
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const userId = req.session.user.id;
        const { productId } = req.body;

        console.log("User ID:", userId);
        console.log("Product ID to remove:", productId);

        const wishlist = await Wishlist.findOne({ userId });
        console.log("Wishlist found:", wishlist);

        if (wishlist) {
            wishlist.products = wishlist.products.filter(
                (item) => !item.productId.equals(productId)
            );

            await wishlist.save();
            console.log("Product removed. Updated Wishlist:", wishlist);

            res.json({ success: true, message: 'Product removed from wishlist' });
        } else {
            console.log("Wishlist not found for user");
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
                console.error('Error destroying session:', err);
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
    removeFromCart,
    loadCheckout,
    addCheckoutAddress,
    postAddCheckoutAddress,
    editCheckoutAddress,
    postEditCheckoutAddress,
    // placeOrder,
    loadOrderConfirmation,
    loadWishlist,
    addToWishlist,
    addToCartFromWishlist,
    removeFromWishlist,
    logout
}