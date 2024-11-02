// utils/otpStorage.js
const otpStore = {};

// Function to store OTP
function storeOTP(email, otp) {
    otpStore[email] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 }; // OTP expires in 10 minutes
}

// Function to verify OTP
function verifyOTP(email, enteredOtp) {
    const otpEntry = otpStore[email];
    if (!otpEntry) return false;

    const { otp, expiresAt } = otpEntry;
    if (Date.now() > expiresAt) {
        delete otpStore[email]; // Remove expired OTP
        return false;
    }

    if (otp === enteredOtp) {
        delete otpStore[email]; // Clear OTP after successful verification
        return true;
    }
    return false;
}

module.exports = {
    storeOTP,
    verifyOTP
};
