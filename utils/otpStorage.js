const Otp = require("../models/otpModel");

// Function to store OTP
async function storeOTP(email, otp) {
     await Otp.deleteMany({ email });
     await Otp.create({
        email,
        otp
     });
}

// Function to verify OTP
async function verifyOTP(email, enteredOtp) {
    const record = await Otp.findOne({ email });

    if(!record) return false;

    if (record.otp === enteredOtp) {
        await Otp.deleteOne({ email }); // To remove the stored otp after verification
        return true;
    }

    return false;
}

module.exports = {
    storeOTP,
    verifyOTP
};
