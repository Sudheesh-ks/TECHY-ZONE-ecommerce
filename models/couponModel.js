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
        max: 100, // Example: discount as a percentage
    },
    minAmount: {
        type: Number,
        required: true, // Example: minimum order amount for the coupon to apply
    },
    maxDiscount: {
        type: Number,
        required: true, // Example: maximum discount that can be applied
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
        required: true, // Example: maximum number of times the coupon can be used
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
