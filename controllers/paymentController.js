const razorpayInstance = require('../config/razorpayConfig');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Coupon = require('../models/couponModel');
const crypto = require('crypto');

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const couponCode = req.session.appliedCoupon ? req.session.appliedCoupon.couponCode : req.body.couponCode;

        if (!addressId) {
            return res.status(400).send('Address is required.');
        }

        const userId = req.session.user.id;

        // Fetch the selected address
        const userAddresses = await Address.findOne({ userId });
        const selectedAddress = userAddresses?.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(404).send('Address not found.');
        }

        // Fetch cart or single product
        const { productId, quantity } = req.query;
        let orderProducts = [];
        let totalPrice = 0;

        if (productId && quantity) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).send('Product not found.');
            }

            orderProducts.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                quantity: parseInt(quantity),
                image: product.images[0] || 'default-image.jpg',
            });

            totalPrice = product.price * quantity;
        } else {
            const cart = await Cart.findOne({ userId });
            if (!cart || cart.items.length === 0) {
                return res.status(400).send('Your cart is empty.');
            }

            orderProducts = cart.items.map(item => ({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.images,
            }));

            totalPrice = cart.totalPrice;
        }

        // Apply coupon if available
        let discountAmount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({ 
                couponCode: couponCode.toUpperCase(), 
                isActive: true, 
                expiryDate: { $gte: new Date() } 
            });

            if (!coupon) {
                return res.status(400).send('Invalid or expired coupon.');
            }

            if (totalPrice < coupon.minAmount) {
                return res.status(400).send(`Minimum cart value for this coupon is ₹${coupon.minAmount}.`);
            }

            if (coupon.userUsed >= coupon.maxUsage) {
                return res.status(400).send('Coupon usage limit reached.');
            }

            discountAmount = (totalPrice * coupon.discount) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }

            coupon.userUsed += 1;
            await coupon.save();
        }

        // Calculate final total price after applying the coupon
        const finalTotalPrice = totalPrice - discountAmount;

        // Create the order
        const order = new Order({
            userId,
            products: orderProducts,
            totalPrice: finalTotalPrice,
            address: selectedAddress,
            paymentMethod,
            paymentStatus: 'Pending',
            status: 'Pending',
            couponCode: couponCode || null,
            discountAmount,
        });

        await order.save();

        // Decrease stock
        for (const item of orderProducts) {
            const product = await Product.findById(item.productId);
            if (product) {
                if (product.stock < item.quantity) {
                    return res.status(400).send(`Insufficient stock for ${product.name}.`);
                }
                product.stock -= item.quantity;
                await product.save();
            }
        }

        // Clear cart if needed
        if (!productId) {
            await Cart.deleteOne({ userId });
        }

        // Payment handling
        if (paymentMethod === 'Cash on Delivery') {
            return res.redirect(`/order-confirmation/${order._id}`);
        } else if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpayInstance.orders.create({
                amount: Math.round(finalTotalPrice * 100),
                currency: 'INR',
                receipt: `order_${Date.now()}`,
            });

            return res.json({
                razorpayOrderId: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                orderId: order._id,
                razorpayKey: process.env.RAZORPAY_KEY_ID,
            });
        } else {
            return res.status(400).send('Invalid payment method.');
        }
    } catch (error) {
        console.error('Error placing order:', error.message);
        return res.status(500).send('Internal Server Error');
    }
};






const verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, razorpayOrderId, razorpaySignature } = req.body;

        const body = razorpayOrderId + "|" + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET) // Use the secret key from .env
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpaySignature) {
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'Completed';
                order.status = 'Pending';
                await order.save();

                // Clear cart after successful payment
                await Cart.deleteOne({ userId: order.userId });

                res.status(200).send('Payment verified.');
            } else {
                res.status(404).send('Order not found.');
            }
        } else {
            res.status(400).send('Invalid signature.');
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    placeOrder,
    verifyPayment
};

