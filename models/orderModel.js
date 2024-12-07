const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            name: String,
            price: Number,
            quantity: Number,
            image: String,
            status: {
                type: String,
                enum: ['Pending', 'Cancelled', 'Delivered'],
                default: 'Pending' // Default status for new products
            },
            returnStatus: {
                type: String,
                enum: ['Not Requested', 'Requested', 'Approved', 'Rejected'],
                default: 'Not Requested'
            },
            returnReason: {
                type: String,
                default: ''
            },
            returnRequestedAt: {
                type: Date
            },
            returnApprovedAt: {
                type: Date
            }
        }
    ],
    totalPrice: {
        type: Number,
        required: true
    },
    address: {
        name: String,
        phone: String,
        altPhone: String,
        addressType: String,
        city: String,
        landMark: String,
        state: String,
        pincode: String
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'Razorpay', 'Wallet'],
        required: true
    },
    paymentStatus: { 
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    status: {
        type: String,
        enum: ['Pending', 'Delivered', 'Cancelled', 'Returned'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    returnStatus: {
        type: String,
        enum: ['Not Requested', 'Requested', 'Approved', 'Rejected'],
        default: 'Not Requested'
    },
    returnReason: {
        type: String,
        default: ''
    },
    returnRequestedAt: {
        type: Date 
    },
    returnApprovedAt: {
        type: Date
    }
});

orderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', orderSchema);
