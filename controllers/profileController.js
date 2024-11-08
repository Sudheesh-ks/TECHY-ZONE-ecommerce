const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const session = require('express-session');


const loadForgotPassword = async (req, res) => {
    try {
        res.render('users/forgot-password');
    } catch (error) {
        console.error("Error loading forgot password page:", error.message);
        res.redirect('/users/error');
    }
};


const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.render('users/forgot-password', { message: "User with this email does not exist." });
        }

        const otp = generateOTP();
        req.session.userOtp = otp;
        req.session.email = email;

        await sendVerificationEmail(email, otp);
        console.log("OTP sent:", otp);

        res.render('users/forgot-pass-otp');
    } catch (error) {
        console.error("Error validating email:", error.message);
        res.redirect('/error');
    }
};


const verifyForgotOTP = async (req, res) => {
    const { otp } = req.body;

    if (otp === req.session.userOtp) {
        res.render('users/reset-password');
    } else {
        res.render('users/forgot-pass-otp', { message: "Invalid OTP. Please try again." });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.render('users/reset-password', { message: "Password is required." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await User.updateOne({ email: req.session.email }, { password: hashedPassword });

        req.session.userOtp = null;
        req.session.email = null;

        res.render('users/login');
    } catch (error) {
        console.error("Error resetting password:", error.message);
        res.redirect('/users/error');
    }
};


// Function to Generate OTP
function generateOTP(length = 6) {
    const characters = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return otp;
}


const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<h4>Your OTP: ${otp}</h4>`,
        });

        return true;
    } catch (error) {
        console.error("Error sending OTP email:", error.message);
        return false;
    }
};

module.exports = {
    loadForgotPassword,
    forgotEmailValid,
    verifyForgotOTP,
    resetPassword,
};
