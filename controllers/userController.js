const User = require('../models/userModel');
const bcrypt = require('bcrypt');
const { generateOTP, sendOTP } = require('../utils/otp');
const { storeOTP, verifyOTP } = require('../utils/otpStorage');



const saltRounds = 10; // Salt rounds for hashing complexity

const loadRegister = async(req,res) => {
    try{

        res.render('users/registration');

    }catch (error){
        console.log(error.message);
        
    }
}

const insertUser = async(req,res) => {
    const { name, email, phno, password} = req.body;

    try {

        // Hash the password before storing it in the session
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Store the user data temporarily in the session
        req.session.tempUserData = {name, email, phno, password: hashedPassword};

        // Generate OTP and store it
        const otp = generateOTP();
        storeOTP(email, otp);
        await sendOTP(email, otp);

        // Redirect to OTP verification page
        res.render('users/otp-verification', {email});
    } catch (error) {
        console.log("Error during OTP generation:", error.message);
        res.render('users/registration', {message: "Error during registration"});
    }
};


const loadOTPVerification = async (req, res) => {
    const {email} = req.query;
    res.render('users/otp-verification', {email});
};



const verifyOTPController = async (req, res) => {
    const {  otp } = req.body;
    const {name, email, phno, password} = req.session.tempUserData;
    const isVerified = verifyOTP(email, otp);
    if (isVerified) {
        try {
            console.log(name, email, phno, password)
            const user = await new User({
                name,
                email,
                phno,
                password
            });
            const userDataSaved = await user.save();
            delete req.session.tempUserData;

            if (userDataSaved) {
                res.render('users/index', { message: "Your account has been verified. Please log in." });
            } else {
                res.render('users/otp-verification', { message: "Failed to store user data after verification.", email });
            }
        } catch (error) {
            console.log("Error during user storage:", error.message);
            res.render('users/otp-verification', { message: "Error storing user data.", email });
        }
    } else {
        res.render('users/otp-verification', { message: "Invalid or expired OTP. Please try again.", email });
    }
};


const loadLogin = async(req,res) => {
    try{

        res.render('users/login');

    }catch (error){
        console.log(error.message);
        
    }
}


const login = async(req,res) => {
    const {email,password} = req.body;
    console.log(email,password)
    try {
        // Retrieve the user by email
        const user = await User.findOne({ email });

        if (user) {
            // Compare the entered password with the hashed password in the database
            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (isPasswordValid) {
                // Password is correct, proceed with login
                res.render('users/index', { message: "Your login is successful" });
            } else {
                // Password is incorrect
                res.render('users/login', { message: "Invalid email or password" });
            }
        } else {
            // User with the provided email does not exist
            res.render('users/login', { message: "Invalid email or password" });
        }
    } catch (error) {
        console.log("Error during login:", error.message);
        res.render('users/login', { message: "An error occurred during login" });
    }
}



const loadHome = async(req,res) => {
    try{

        res.render('users/index');

    }catch (error){
        console.log(error.message);
        
    }
}


const loadShop = async(req,res) => {
    try{

        res.render('users/product');

    }catch (error){
        console.log(error.message);
        
    }
}


const loadMyAccount = async(req,res) => {
    try{

        res.render('users/myaccount');

    }catch (error){
        console.log(error.message);
        
    }
}


const loadAbout = async(req,res) => {
    try{

        res.render('users/about');

    }catch (error){
        console.log(error.message);
        
    }
}


const loadContact = async(req,res) => {
    try{

        res.render('users/contact');

    }catch (error){
        console.log(error.message);
        
    }
}

module.exports ={
    loadRegister,
    insertUser,
    loadLogin,
    login,
    loadOTPVerification,
    verifyOTPController,
    loadHome,
    loadShop,
    loadMyAccount,
    loadAbout,
    loadContact
}