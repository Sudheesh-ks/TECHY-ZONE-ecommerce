const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    items: [{
        productId: {
             type: mongoose.Schema.Types.ObjectId,
              ref: 'Products' 
            },

        quantity: {
             type: Number,
              default: 1 
            },
            
        name: String,
        price: Number,
        images: String
    }],
    totalQuantity: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
});

module.exports = mongoose.model('Cart', cartSchema);
