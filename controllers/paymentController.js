const mongoose = require("mongoose");
const razorpayInstance = require("../config/razorpayConfig");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Coupon = require("../models/couponModel");
const Wallet = require("../models/walletModel");
const crypto = require("crypto");
const STATUS_CODES = require("../constants/status.constants");
const MESSAGES = require("../constants/responseMessage");

const placeOrder = async (req, res) => {
  const session = await mongoose.startSession();
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type === 'ReplicaSetWithPrimary' ||
    mongoose.connection.getClient().topology?.description?.type === 'Sharded';

  try {
    if (isReplicaSet) session.startTransaction();
    const { addressId, paymentMethod } = req.body;
    const couponCode = req.session.appliedCoupon
      ? req.session.appliedCoupon.couponCode
      : req.body.couponCode;

    if (!addressId) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const userId = req.session.user.id;

    const userAddresses = await Address.findOne({ userId }).session(session);
    const selectedAddress = userAddresses?.address?.find(
      (addr) => addr._id.toString() === addressId,
    );
    if (!selectedAddress) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.NOT_FOUND });
    }

    const { productId, quantity } = req.query;
    let orderProducts = [];
    let totalPrice = 0;

    if (productId && quantity) {
      const product = await Product.findById(productId).session(session);
      if (!product) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ success: false, message: MESSAGES.NOT_FOUND });
      }

      const productPrice = Number(product.offerPrice || product.price) || 0;

      orderProducts.push({
        productId: product._id,
        name: product.name,
        price: Number(productPrice.toFixed(2)),
        quantity: parseInt(quantity),
        image: product.images[0] || "default-image.jpg",
      });

      totalPrice = Number((productPrice * parseInt(quantity)).toFixed(2));
    } else {
      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart || cart.items.length === 0) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      orderProducts = cart.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: item.quantity,
        image: item.images,
      }));

      totalPrice = Number(cart.totalPrice) || 0;
    }

    let discountAmount = 0;
    if (couponCode) {
      const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();
      const coupon = await Coupon.findOne({
        couponCode: { $regex: `^${normalizedCouponCode}$`, $options: "i" },
        isActive: true,
        expiryDate: { $gte: new Date() },
      }).session(session);

      if (!coupon) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      if (totalPrice < coupon.minAmount) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      if (coupon.userUsed >= coupon.maxUsage) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      discountAmount = (totalPrice * coupon.discount) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }

      coupon.userUsed += 1;
      await coupon.save({ session });
    }

    const roundedDiscountAmount = Number(discountAmount.toFixed(2));
    const discountRate = totalPrice > 0 ? roundedDiscountAmount / totalPrice : 0;
    const discountedOrderProducts = orderProducts.map((item) => {
      const unitPrice = Number(item.price) || 0;
      const discountedUnitPrice = Math.max(0, unitPrice - unitPrice * discountRate);
      return {
        ...item,
        price: Number(discountedUnitPrice.toFixed(2)),
      };
    });

    const finalTotalPrice = Number((totalPrice - roundedDiscountAmount).toFixed(2));

    const deliveryCharge = finalTotalPrice < 500 ? 30 : 0;
    const totalAmountWithDelivery = Number((finalTotalPrice + deliveryCharge).toFixed(2));

    console.log("PRICE DETAILS - totalPrice:", totalPrice, "discountAmount:", roundedDiscountAmount, "finalPrice:", finalTotalPrice, "totWithDelivery:", totalAmountWithDelivery);


    if (paymentMethod === "Cash on Delivery" && finalTotalPrice > 1000) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const order = new Order({
      userId,
      products: discountedOrderProducts,
      totalPrice: totalAmountWithDelivery,
      address: selectedAddress,
      paymentMethod,
      paymentStatus: "Pending",
      status: "Pending",
      couponCode: couponCode || null,
      discountAmount: roundedDiscountAmount,
      deliveryCharge,
    });

    await order.save({ session });

    for (const item of orderProducts) {
      const product = await Product.findById(item.productId).session(session);
      if (product) {
        if (product.stock < item.quantity) {
          if (session.inTransaction()) await session.abortTransaction();
          return res
            .status(STATUS_CODES.BAD_REQUEST)
            .json({ success: false, message: MESSAGES.BAD_REQUEST });
        }
        product.stock -= item.quantity;
        await product.save({ session });
      }
    }

    if (!productId) {
      await Cart.deleteOne({ userId }).session(session);
    }

    if (req.session.appliedCoupon) {
      delete req.session.appliedCoupon;
    }

    if (paymentMethod === "Wallet") {
      const wallet = await Wallet.findOne({ userId }).session(session);

      if (!wallet || wallet.balance < totalAmountWithDelivery) {
        if (session.inTransaction()) await session.abortTransaction();
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      wallet.balance -= totalAmountWithDelivery;
      wallet.transactions = wallet.transactions.concat({
        amount: totalAmountWithDelivery,
        type: "Debit",
        description: "Order placed",
      });
      await wallet.save({ session });

      order.paymentStatus = "Completed";
      await order.save({ session });

      if (session.inTransaction()) await session.commitTransaction();
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Order placed successfully!",
        orderId: order._id,
        redirectUrl: `/order-confirmation/${order._id}`,
      });
    } else if (paymentMethod === "Cash on Delivery") {
      if (session.inTransaction()) await session.commitTransaction();
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: "Order placed successfully!",
        orderId: order._id,
        redirectUrl: `/order-confirmation/${order._id}`,
      });
    } else if (paymentMethod === "Razorpay") {
      const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(totalAmountWithDelivery * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`,
      });

      if (session.inTransaction()) await session.commitTransaction();
      return res.json({
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        orderId: order._id,
        razorpayKey: process.env.RAZORPAY_KEY_ID,
      });
    } else {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error placing order:", error.message, error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  } finally {
    session.endSession();
  }
};

const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { orderId, paymentId, razorpayOrderId, razorpaySignature } = req.body;

    const body = razorpayOrderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === razorpaySignature) {
      const order = await Order.findById(orderId).session(session);
      if (order) {
        order.paymentStatus = "Completed";
        order.status = "Pending";
        await order.save({ session });

        await Cart.deleteOne({ userId: order.userId }).session(session);

        await session.commitTransaction();
        return res.json({ success: true, message: "Payment verified." });
      } else {
        await session.abortTransaction();
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ success: false, message: MESSAGES.NOT_FOUND });
      }
    } else {
      await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error verifying payment:", error.message, error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
  } finally {
    session.endSession();
  }
};

const retryPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId);

    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.NOT_FOUND });
    }

    if (
      order.paymentStatus !== "Pending" ||
      order.paymentMethod !== "Razorpay"
    ) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    if (!order.totalPrice) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Invalid order amount for retry." });
    }

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: Math.round(order.totalPrice * 100),
      currency: "INR",
      receipt: `order_${order._id}`,
    });

    return res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error in retryPayment:", error.message);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  placeOrder,
  verifyPayment,
  retryPayment,
};
