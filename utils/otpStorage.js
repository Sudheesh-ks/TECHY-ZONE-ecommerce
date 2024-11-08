const otpStore = {};

// Function to store OTP
function storeOTP(email, otp) {
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; 
}

// Function to verify OTP
function verifyOTP(email, enteredOtp) {
    const otpEntry = otpStore[email];
    if (!otpEntry) return false;

    const { otp, expiresAt } = otpEntry;
    if (Date.now() > expiresAt) {
        delete otpStore[email]; // To remove expired OTP
        return false;
    }

    if (otp === enteredOtp) {
        delete otpStore[email]; // To remove the stored otp after verification
        return true;
    }
    return false;
}

module.exports = {
    storeOTP,
    verifyOTP
};
