const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Wallet = require("../models/walletModel");
const STATUS_CODES = require("../constants/status.constants");
const MESSAGES = require("../constants/responseMessage");

const getAllOrders = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }

    let page = 1;
    if (req.query.page) {
      page = parseInt(req.query.page);
    }
    const limit = 4;

    const count = await Order.countDocuments();

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .lean()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    if (!orders || orders.length === 0) {
      return res.render("admin/admin-orders", {
        orders: [],
        message: "No orders found.",
      });
    }

    for (let order of orders) {
      let totalQuantity = 0;

      const user = await User.findById(order.userId);
      order.user = user;

      for (let item of order.products) {
        const product = await Product.findById(item.productId);
        item.productDetails = product;

        totalQuantity += item.quantity;
      }

      order.totalQuantity = totalQuantity;

      order.isReturnRequested = order.returnStatus === "Requested";
    }

    res.render("admin/orders", {
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const loadOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.render("admin/order-detail", {
        order: null,
        message: "Order not found.",
      });
    }

    const user = await User.findById(order.userId).lean();
    if (user) {
      order.user = user;
    }

    for (let item of order.products) {
      const product = await Product.findById(item.productId).lean();
      if (product) {
        item.productDetails = {
          name: product.name,
          offerPrice: product.offerPrice,
          price: product.price,
          images: product.images[0],
        };
      }
    }

    res.render("admin/order-detail", { order });
  } catch (error) {
    console.error("Error fetching order details:", error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const validStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: MESSAGES.BAD_REQUEST });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true },
    );

    if (!order) {
      console.log(`Order with ID ${orderId} not found.`);
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.NOT_FOUND });
    }

    order.status = status;

    if (status === "Delivered") {
      order.paymentStatus = "Completed";
    }

    await order.save();

    console.log(`Order ${orderId} status updated to ${status}`);
    if (status === "Delivered" && order.paymentMethod === "COD") {
      console.log(`Payment status for order ${orderId} updated to Completed.`);
    }

    console.log(`Order ${orderId} status updated to ${status}`);
    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Error updating order status:", error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

const approveReturn = async (req, res) => {
  const session = await mongoose.startSession();
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type === 'ReplicaSetWithPrimary' ||
    mongoose.connection.getClient().topology?.description?.type === 'Sharded';
  try {
    if (isReplicaSet) session.startTransaction();
    const orderId = req.params.id;

    const order = await Order.findById(orderId).session(session);

    if (!order) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.NOT_FOUND });
    }

    const userId = order.userId;
    const refundAmount = order.totalPrice;

    let wallet = await Wallet.findOne({ userId }).session(session);

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: refundAmount,
        transactions: [
          {
            amount: refundAmount,
            type: "Credit",
            description: `Refund for returned order ${orderId}`,
          },
        ],
      });
    } else {
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: "Credit",
        description: `Refund for returned order ${orderId}`,
      });
    }

    await wallet.save({ session });

    order.returnStatus = "Approved";
    order.status = "Returned";
    await order.save({ session });

    if (session.inTransaction()) await session.commitTransaction();

    console.log(
      `Refund of ₹${refundAmount} credited to wallet for user ${userId}.`,
    );

    req.flash("success", "Return approved successfully!");
    res.redirect(`/admin/order-detail/${orderId}`);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error approving return:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
    req.flash("error", "Failed to approve return. Please try again.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

const rejectReturn = async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!updatedOrder) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.NOT_FOUND });
    }

    req.flash("success", "Return rejected successfully!");
    res.redirect(`/admin/order-detail/${orderId}`);
  } catch (error) {
    console.error("Error rejecting return:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
    req.flash("error", "Failed to reject return. Please try again.");
    res.redirect("back");
  }
};

const approveProductReturn = async (req, res) => {
  const { id: orderId, productId } = req.params;
  const session = await mongoose.startSession();
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type === 'ReplicaSetWithPrimary' ||
    mongoose.connection.getClient().topology?.description?.type === 'Sharded';

  try {
    if (isReplicaSet) session.startTransaction();
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      if (session.inTransaction()) await session.abortTransaction();
      req.flash("error", "Order not found");
      return res.redirect("back");
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId,
    );
    if (!product || product.returnStatus !== "Requested") {
      if (session.inTransaction()) await session.abortTransaction();
      req.flash("error", "Invalid product return request");
      return res.redirect("back");
    }

    product.returnStatus = "Approved";
    product.returnApprovedAt = new Date();

    const refundAmount = product.price * product.quantity;

    let wallet = await Wallet.findOne({ userId: order.userId }).session(session);
    if (!wallet) {
      wallet = new Wallet({
        userId: order.userId,
        balance: refundAmount,
        transactions: [
          {
            amount: refundAmount,
            type: "Credit",
            description: `Refund for returned product ${productId} in order ${orderId}`,
          },
        ],
      });
    } else {
      wallet.balance += refundAmount;
      wallet.transactions.push({
        amount: refundAmount,
        type: "Credit",
        description: `Refund for returned product ${productId} in order ${orderId}`,
      });
    }

    await wallet.save({ session });

    const allApproved = order.products.every(
      (p) => p.returnStatus === "Approved",
    );
    if (allApproved) {
      order.status = "Returned";
    }

    await order.save({ session });

    if (session.inTransaction()) await session.commitTransaction();

    req.flash(
      "success",
      "Product return approved and wallet credited successfully!",
    );
    res.redirect(`/admin/order-detail/${orderId}`);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error approving return:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
    req.flash("error", "Failed to approve return. Please try again.");
    res.redirect("back");
  } finally {
    session.endSession();
  }
};

const rejectProductReturn = async (req, res) => {
  try {
    const { id: orderId, productId } = req.params;

    if (!order) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ message: MESSAGES.NOT_FOUND });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId,
    ); // Finding the product
    if (!product || product.returnStatus !== "Requested") {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ message: "Invalid product return request" });
    }

    product.returnStatus = "Rejected";

    await order.save();

    res.redirect(`/admin/order-detail/${orderId}`);
  } catch (error) {
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ message: error.message || MESSAGES.INTERNAL_SERVER_ERROR });
  }
};

module.exports = {
  getAllOrders,
  loadOrderDetails,
  updateOrderStatus,
  approveReturn,
  rejectReturn,
  approveProductReturn,
  rejectProductReturn,
};
