const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
    },
    discount: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
    },
    minAmount: {
        type: Number,
        required: true, 
    },
    maxDiscount: {
        type: Number,
        required: true, 
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    maxUsage: {
        type: Number,
        required: true,
    },
    userUsed: {
        type: Number,
        default: 0,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});
module.exports = mongoose.model('Coupon', couponSchema);
