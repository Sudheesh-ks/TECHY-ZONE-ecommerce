const razorpayInstance = require('../config/razorpayConfig');
const Address = require('../models/addressModel');
const Order = require('../models/orderModel');
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const Coupon = require('../models/couponModel');
const Wallet = require('../models/walletModel');
const crypto = require('crypto');
const STATUS_CODES = require('../constants/status.constants');
const MESSAGES = require('../constants/responseMessage');

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod } = req.body;
        const couponCode = req.session.appliedCoupon ? req.session.appliedCoupon.couponCode : req.body.couponCode; // Using the coupon code from the session

        if (!addressId) {
            return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
        }

        const userId = req.session.user.id;

        const userAddresses = await Address.findOne({ userId }); // Fetching user addresses
        const selectedAddress = userAddresses?.address.find(addr => addr._id.toString() === addressId);
        if (!selectedAddress) {
            return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.NOT_FOUND);
        }

        const { productId, quantity } = req.query;
        let orderProducts = [];
        let totalPrice = 0;

        if (productId && quantity) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.NOT_FOUND);
            }

            orderProducts.push({ // Adding the product to the order
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
                return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
            }

            orderProducts = cart.items.map(item => ({ // Adding the cart items to the order
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.images,
            }));

            totalPrice = cart.totalPrice;
        }

        let discountAmount = 0;
        if (couponCode) {
            const coupon = await Coupon.findOne({  // Checking if the coupon is valid
                couponCode: couponCode.toUpperCase(), 
                isActive: true, 
                expiryDate: { $gte: new Date() } 
            });

            if (!coupon) {
                return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
            }

            if (totalPrice < coupon.minAmount) { // Checking if the cart total is greater than or equal to the minimum amount
                return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
            }

            if (coupon.userUsed >= coupon.maxUsage) { // Checking if the coupon can still be used
                return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
            }

            discountAmount = (totalPrice * coupon.discount) / 100;     // Checking if the discount is less than or equal to the maximum discount
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
                discountAmount = coupon.maxDiscount;
            }

            coupon.userUsed += 1;
            await coupon.save();
        }

        const finalTotalPrice = totalPrice - discountAmount; // Calculating the final total price

         const deliveryCharge = finalTotalPrice < 500 ? 30 : 0; // Calculating the delivery charge
         const totalAmountWithDelivery = finalTotalPrice + deliveryCharge;

        if (paymentMethod === 'Cash on Delivery' && finalTotalPrice > 1000) {  // Checking if Cash on Delivery is available
            return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
        }

        const order = new Order({
            userId,
            products: orderProducts,
            totalPrice: totalAmountWithDelivery,
            address: selectedAddress,
            paymentMethod,
            paymentStatus: 'Pending',
            status: 'Pending',
            couponCode: couponCode || null,
            discountAmount,
            deliveryCharge,
        });

        await order.save();

        for (const item of orderProducts) {
            const product = await Product.findById(item.productId);
            if (product) {
                if (product.stock < item.quantity) {
                    return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
                }
                product.stock -= item.quantity;
                await product.save();
            }
        }

        if (!productId) { // Clearing the cart if the order is placed from the cart
            await Cart.deleteOne({ userId });
        }

        if (req.session.appliedCoupon) {
            delete req.session.appliedCoupon;
            console.log('Coupon removed from session after order.');
        } else {
            console.log('Coupon not found in session.');
        }


        if (paymentMethod === 'Wallet') { // Checking if the payment method is Wallet
            const wallet = await Wallet.findOne({ userId });
        
            if (!wallet || wallet.balance < totalAmountWithDelivery) {
                return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
            }
        
            wallet.balance -= totalAmountWithDelivery; // Deducting the total amount from the wallet
            wallet.transactions = wallet.transactions.concat({ amount: totalAmountWithDelivery, type: 'Debit', description: 'Order placed' })
            await wallet.save();
        
            order.paymentStatus = 'Completed';  // Updating the payment status
            await order.save();
            console.log(`Payment of ₹${totalAmountWithDelivery} completed using Wallet.`);
            return res.status(200).json({
                success: true,
                message: 'Order placed successfully!',
                orderId: order._id,
                redirectUrl: `/order-confirmation/${order._id}`,
            });      

        } else if (paymentMethod === 'Cash on Delivery') {  // Checking if the payment method is Cash on Delivery
            return res.status(200).json({
                success: true,
                message: 'Order placed successfully!',
                orderId: order._id,
                redirectUrl: `/order-confirmation/${order._id}`,
            });
        } else if (paymentMethod === 'Razorpay') {
            const razorpayOrder = await razorpayInstance.orders.create({   // Creating the Razorpay order
                amount: Math.round(totalAmountWithDelivery * 100),
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
            return res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
        }
    } catch (error) {
        console.error('Error placing order:', error.message, error);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};



const verifyPayment = async (req, res) => {
    try {
        const { orderId, paymentId, razorpayOrderId, razorpaySignature } = req.body;

        const body = razorpayOrderId + "|" + paymentId;  // Concatenating the Razorpay order ID and payment ID
        const expectedSignature = crypto  // Creating the expected signature
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpaySignature) {  // Verifying the signature
            const order = await Order.findById(orderId);
            if (order) {
                order.paymentStatus = 'Completed';
                order.status = 'Pending';
                await order.save();

                await Cart.deleteOne({ userId: order.userId });  // Clearing the cart

                return res.json({ success: true, message: 'Payment verified.' });
            } else {
                res.status(STATUS_CODES.NOT_FOUND).send(MESSAGES.NOT_FOUND);
            }
        } else {
            res.status(STATUS_CODES.BAD_REQUEST).send(MESSAGES.BAD_REQUEST);
        }
    } catch (error) {
        console.error(error.message);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).send(MESSAGES.INTERNAL_SERVER_ERROR);
    }
};


const retryPayment = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.NOT_FOUND });
        }

        if (order.paymentStatus !== 'Pending' || order.paymentMethod !== 'Razorpay') {  // Checking if the order is pending and payment method is Razorpay
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
        }

        if (!order.totalPrice) {  // Checking if the order total price is available
            return res.status(400).json({ success: false, message: 'Invalid order amount for retry.' });
        }

        const razorpayOrder = await razorpayInstance.orders.create({  // Creating the Razorpay order
            amount: Math.round(order.totalPrice * 100),
            currency: 'INR',
            receipt: `order_${order._id}`, 
        });

        res.json({
            success: true,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            razorpayKey: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error('Error in retryPayment:', error.message);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};



module.exports = {
    placeOrder,
    verifyPayment,
    retryPayment
};

