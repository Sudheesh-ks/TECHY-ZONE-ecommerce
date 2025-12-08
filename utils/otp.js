require("dotenv").config(); 

const nodemailer = require('nodemailer');

function generateOTP(){
    return Math.floor(100000 + Math.random() * 900000);
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
        from: process.env.NODEMAILER_EMAIL,
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
