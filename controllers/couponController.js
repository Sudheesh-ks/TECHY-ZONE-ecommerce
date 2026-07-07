const mongoose = require("mongoose");
const Coupon = require("../models/couponModel");
const STATUS_CODES = require("../constants/status.constants");
const MESSAGES = require("../constants/responseMessage");

const loadCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ expiryDate: -1 });
    res.render("admin/coupon", { coupons });
  } catch (error) {
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const loadAddCoupon = async (req, res) => {
  try {
    res.render("admin/addCoupon");
  } catch (error) {
    console.log(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.NOT_FOUND });
    }
    res.render("admin/editCoupon", { coupon });
  } catch (error) {
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      couponCode,
      discount,
      minAmount,
      expiryDate,
      maxDiscount,
      maxUsage,
    } = req.body;

    if (!couponCode || !discount || !minAmount || !expiryDate) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const discountValue = Number(discount);
    const minAmountValue = Number(minAmount);
    const maxDiscountValue = Number(maxDiscount || 0);
    const maxUsageValue = Number(maxUsage || 0);

    if (!Number.isFinite(discountValue) || discountValue < 1 || discountValue > 90) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Discount must be between 1% and 90%.",
      });
    }

    if (!Number.isFinite(minAmountValue) || minAmountValue < 100) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Minimum amount must be at least ₹100.",
      });
    }

    if (!Number.isFinite(maxDiscountValue) || maxDiscountValue < 50) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum discount must be at least ₹50.",
      });
    }

    if (!Number.isFinite(maxUsageValue) || maxUsageValue < 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum usage must be at least 1.",
      });
    }

    if (maxDiscountValue > minAmountValue) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum discount cannot be greater than the minimum cart amount.",
      });
    }

    const existingCoupon = await Coupon.findOne({
      couponCode,
      _id: { $ne: id },
    });
    if (existingCoupon) {
      return res
        .status(STATUS_CODES.CONFLICT)
        .json({ success: false, message: MESSAGES.CONFLICT });
    }

    await Coupon.findByIdAndUpdate(id, {
      couponCode,
      discount,
      minAmount,
      maxDiscount,
      maxUsage,
      expiryDate,
    });

    res.status(STATUS_CODES.OK).json({ message: MESSAGES.SUCCESS });
  } catch (error) {
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const addCoupon = async (req, res) => {
  try {
    const {
      couponCode,
      discount,
      minAmount,
      expiryDate,
      maxDiscount,
      maxUsage,
    } = req.body;

    if (!couponCode || !discount || !minAmount || !expiryDate) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const discountValue = Number(discount);
    const minAmountValue = Number(minAmount);
    const maxDiscountValue = Number(maxDiscount || 0);
    const maxUsageValue = Number(maxUsage || 0);

    if (!Number.isFinite(discountValue) || discountValue < 1 || discountValue > 90) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Discount must be between 1% and 90%.",
      });
    }

    if (!Number.isFinite(minAmountValue) || minAmountValue < 100) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Minimum amount must be at least ₹100.",
      });
    }

    if (!Number.isFinite(maxDiscountValue) || maxDiscountValue < 50) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum discount must be at least ₹50.",
      });
    }

    if (!Number.isFinite(maxUsageValue) || maxUsageValue < 1) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum usage must be at least 1.",
      });
    }

    if (maxDiscountValue > minAmountValue) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: "Maximum discount cannot be greater than the minimum cart amount.",
      });
    }

    const existingCoupon = await Coupon.findOne({ couponCode });
    if (existingCoupon) {
      return res
        .status(STATUS_CODES.CONFLICT)
        .json({ success: false, message: MESSAGES.CONFLICT });
    }

    const coupon = new Coupon({
      couponCode,
      discount,
      minAmount,
      maxDiscount,
      maxUsage,
      expiryDate,
    });

    await coupon.save();

    res.status(STATUS_CODES.CREATED).json({ message: MESSAGES.CREATED });
  } catch (error) {
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.NOT_FOUND });
    }

    res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: MESSAGES.SUCCESS });
  } catch (error) {
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};

const applyCoupon = async (req, res) => {
  const { couponCode, cartTotal } = req.body;
  const session = await mongoose.startSession();
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type === 'ReplicaSetWithPrimary' ||
    mongoose.connection.getClient().topology?.description?.type === 'Sharded';

  try {
    if (isReplicaSet) session.startTransaction();
    const coupon = await Coupon.findOne({
      couponCode,
      isActive: true,
    }).session(session);

    if (!coupon) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    if (cartTotal < coupon.minAmount) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        message: MESSAGES.BAD_REQUEST,
      });
    }

    if (coupon.userUsed >= coupon.maxUsage) {
      if (session.inTransaction()) await session.abortTransaction();
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const discount = coupon.discount
      ? (cartTotal * coupon.discount) / 100
      : Math.min(cartTotal, coupon.maxDiscount);

    const discountedTotal = Math.max(cartTotal - discount, 0);

    req.session.appliedCoupon = {
      couponCode: coupon.couponCode,
      discount,
    };

    coupon.userUsed += 1;
    coupon.maxUsage -= 1;
    await coupon.save({ session });

    if (session.inTransaction()) await session.commitTransaction();

    return res.status(STATUS_CODES.OK).json({
      success: true,
      message: MESSAGES.SUCCESS,
      discount,
      discountedTotal,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error(error.message);
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

const removeCoupon = async (req, res) => {
  const session = await mongoose.startSession();
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type === 'ReplicaSetWithPrimary' ||
    mongoose.connection.getClient().topology?.description?.type === 'Sharded';
  try {
    if (isReplicaSet) session.startTransaction();
    if (req.session.appliedCoupon) {
      const { couponCode } = req.session.appliedCoupon;

      const coupon = await Coupon.findOne({ couponCode }).session(session);
      if (coupon) {
        coupon.userUsed -= 1;
        coupon.maxUsage += 1;
        await coupon.save({ session });
      }

      delete req.session.appliedCoupon;
    }
    if (session.inTransaction()) await session.commitTransaction();
    res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: MESSAGES.SUCCESS });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error(error.message);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
  } finally {
    session.endSession();
  }
};

module.exports = {
  loadCoupon,
  loadAddCoupon,
  addCoupon,
  deleteCoupon,
  applyCoupon,
  removeCoupon,
  loadEditCoupon,
  updateCoupon,
};
