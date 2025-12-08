const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
const { generateOTP, sendOTP } = require("../utils/otp");
const Otp = require("../models/otpModel");


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

        await Otp.deleteMany({ email });
        await Otp.create({ email, otp });

        await sendOTP(email, otp);

        console.log("OTP sent:", otp);

        req.session.resetEmail = email;

        res.render('users/forgot-pass-otp', { email });

    } catch (error) {
        console.error("Error validating email:", error.message);
        res.redirect('/error');
    }
};


const securePassword = async (password) => {
    try{
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    }catch(error){
        console.log(error);
        
    }
}


const verifyForgotPassOTP = async (req, res) => {
    try {
        const enterOtp = req.body.otp;
        const email = req.session.resetEmail;

        const record = await Otp.findOne({ email });

        if (!record) {
            return res.json({ success: false, message: "OTP expired. Please request a new one." });
        }

        if (record.otp !== enterOtp) {
            return res.json({ success: false, message: "Invalid OTP" });
        }

        await Otp.deleteOne({ email });

        return res.json({ success: true, redirectUrl: "reset-password" });

    } catch (error) {
        return res.status(500).json({ success: false, message: "An error occurred" });
    }
};


const resetPassword = async (req, res) => {
    try {
        res.render('users/reset-password');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};


const sendVerificationEmail = async (email, otp) => {
    try {
        const transporter = nodemailer.createTransport({  // Sending OTP
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


const resendOtp = async (req, res) => {
    try {
        const email = req.session.resetEmail;

        const otp = generateOTP();

        await Otp.deleteMany({ email });
        await Otp.create({ email, otp });

        await sendOTP(email, otp);

        res.status(200).json({ success: true, message: "OTP resent successfully" });

    } catch (error) {
        console.log("Error in resend OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const postNewPassword = async (req,res) => {
    try{

        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({email:email},{$set:{password:passwordHash}})  // Updating password
            res.redirect('/login');
        }else{
            res.render("reset-password",{message:"Password do not match"});
        }
    }catch(error){
        res.redirect('/pageNotFound');
    }
}

module.exports = {
    loadForgotPassword,
    forgotEmailValid,
    verifyForgotPassOTP,
    resetPassword,
    resendOtp,
    postNewPassword
};
