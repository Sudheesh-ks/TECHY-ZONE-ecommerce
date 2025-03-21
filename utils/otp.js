require("dotenv").config(); 

const nodemailer = require('nodemailer');


// Function to generate random OTP
function generateOTP(length = 6) {
    let otp = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
        otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return otp;
    
}

// Function to send the OTP through email
async function sendOTP(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
           user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASSWORD
        }
    });

    // Email Structure
    const mailOptions = {
        from:  process.env.NODEMAILER_EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 10 minutes.`
    };

    
    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent to:', email);
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

module.exports = { generateOTP, sendOTP };
