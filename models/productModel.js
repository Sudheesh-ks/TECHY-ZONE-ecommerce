const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number },
    categoryOffer: { type: Number, default: null },
    stock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    images: [{ type: String }],
    category: { type: mongoose.Schema.ObjectId, ref: 'Category' },
    // brand: { type: String },
    warranty: { type: String },
    returnPolicy: { type: String },
    rating: { type: Number, default: 0 },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
        rating: { type: Number, required: true },
        comment: { type: String },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true } 
);

module.exports = mongoose.model('Products', productSchema);
