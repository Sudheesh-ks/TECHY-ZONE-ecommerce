const User = require('../models/userModel');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const env = require('dotenv').config();
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

        if(enterOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:"reset-password"});
           }else{
            res.json({success:false,message:"OTP not matching"});
           }
        
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured. Please try again"});
    }
   
};


const resetPassword = async (req, res) => {
    try {
        res.render('users/reset-password');
    } catch (error) {
        res.redirect('/pageNotFound');
    }
};


// Function to Generate OTP
function generateOTP(length = 6) {
    const characters = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log(otp)
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


const resendOtp = async (req,res) => {

    try {
        
        const otp = generateOTP();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending OTP to email:",email);
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resent OTP:",otp);
            res.status(200).json({success:true, message:"Resend OTP Successful"});
            
        }


    } catch (error) {
        console.log("Error in resend otp",error);
        res.status(500).json({success:'Internal Server Error'});
        
    }
}


const postNewPassword = async (req,res) => {
    try{

        const {newPass1,newPass2} = req.body;
        const email = req.session.email;
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({email:email},{$set:{password:passwordHash}})
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
