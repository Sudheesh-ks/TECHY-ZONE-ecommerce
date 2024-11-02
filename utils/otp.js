const nodemailer = require('nodemailer');


// This function is to generate a random OTP
function generateOTP(length = 6) {
    let otp = '';
    const characters = '0123456789';
    for (let i = 0; i < length; i++) {
        otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return otp;
}

// Function to send the OTP via email
async function sendOTP(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'sudheeshks132@gmail.com',
            pass: 'togw pewh wmwp sonv'
        }
    });

    // Email options
    const mailOptions = {
        from: 'sudheeshks132@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It is valid for 10 minutes.`
    };

    // Send the email
    try {
        await transporter.sendMail(mailOptions);
        console.log('OTP sent to:', email);
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
}

module.exports = { generateOTP, sendOTP };
