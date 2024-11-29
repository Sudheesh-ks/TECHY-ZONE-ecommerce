const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 0
    },
    transactions: [{ // Array to store transaction details
        amount: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            enum: ['Credit', 'Debit'], // Ensure only Credit or Debit types are used
            required: true
        },
        description: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Wallet', walletSchema);
