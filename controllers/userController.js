const User = require('../models/userModel');
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
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
        
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP:", otp);
        console.log("Resending OTP to email:", email);
        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resent OTP:", otp);
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
        //   console.log('Categories:', categories);

        const categoryIds = categories.map((category) => category._id);
        //   console.log('Category IDs:', categoryIds); 

        let productData = await Product.find({
            isDeleted: false,
            category: { $in: categoryIds },
        });

        //   console.log('Fetched Products:', productData); 


        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 8);

        //   console.log('Sorted and Limited Products:', productData); 

        res.render('users/index', { user: req.session.user, categories, products: productData });
    } catch (error) {
        console.log('Error:', error.message);
        res.status(500).send('Error loading home page');
    }
};




const loadShop = async (req, res) => {
    try {

        const categories = await Category.find({ isListed: true });
        //   console.log('Categories:', categories);

        const categoryIds = categories.map((category) => category._id);
        //   console.log('Category IDs:', categoryIds); 

        let productData = await Product.find({
            isDeleted: false,
            category: { $in: categoryIds },
        });

        //   console.log('Fetched Products:', productData); 


        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 8);

        //   console.log('Sorted and Limited Products:', productData); 

        res.render('users/product', { user: req.session.user, categories, products: productData });

    } catch (error) {
        console.log(error.message);

    }
}

const loadProductDetail = async (req, res) => {
    try {
        const { productId } = req.params;

        //   console.log(productId);

        // Fetch the product by its ObjectId
        const product = await Product.findOne({ _id: productId });
        console.log(product)

        // Check if product exists or is deleted
        if (!product || product.isDeleted) {
            return res.status(404).render('users/product-detail', { product: null, msg: "Product not found" });
        }

        // Fetch related products from the same category (excluding the current product)
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: productId },
        }).limit(8);

        // Render the product detail page with the product and related products
        return res.status(200).render('users/product-detail', {
            user: req.session.user,
            product,
            relatedProducts,
            msg: null,
        });

    } catch (error) {
        console.log(error.message);
        return res.status(500).render('users/product-detail', { product: null, msg: "Error loading product details" });
    }
};



const loadMyAccount = async (req, res) => {
    try {

        res.render('users/myaccount',{user: req.session.user});

    } catch (error) {
        console.log(error.message);

    }
}


const loadAbout = async (req, res) => {
    try {

        res.render('users/about',{user: req.session.user});

    } catch (error) {
        console.log(error.message);

    }
}


const loadContact = async (req, res) => {
    try {

        res.render('users/contact',{user: req.session.user});

    } catch (error) {
        console.log(error.message);

    }
}

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
    loadAbout,
    loadContact
}