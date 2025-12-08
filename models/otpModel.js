const mongoose = require('mongoose');

const otpModel = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt : {
        type: Date,
        default: Date.now,
        expires: 120
    }
});

module.exports = mongoose.model("Otp", otpModel);