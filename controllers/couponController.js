const Coupon = require('../models/couponModel');
const STATUS_CODES = require('../constants/status.constants');
const MESSAGES = require('../constants/responseMessage');


const loadCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ expiryDate: -1 });  // Sort by expiryDate in descending order
        res.render('admin/coupon', { coupons });
    } catch (error) {
        console.error(error.message);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}

const loadAddCoupon = async (req,res) => {
    try {
        res.render('admin/addCoupon');
    } catch (error) {
        console.log(error.message);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
}



const addCoupon = async (req, res) => {
    try {
        const { couponCode, discount, minAmount, expiryDate, maxDiscount, maxUsage} = req.body;

        if (!couponCode || !discount || !minAmount || !expiryDate) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ error: MESSAGES.BAD_REQUEST });
        }

        const existingCoupon = await Coupon.findOne({ couponCode });  // Check if the coupon code already exists
        if (existingCoupon) {
            return res.status(STATUS_CODES.CONFLICT).json({ error: MESSAGES.CONFLICT });
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
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};



const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByIdAndDelete(id);  // Deleting coupon by ID
        if (!coupon) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ error: MESSAGES.NOT_FOUND });
        }

        res.status(STATUS_CODES.OK).json({ message: MESSAGES.SUCCESS });
    } catch (error) {
        console.error(error.message);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};


const applyCoupon = async (req, res) => {
    const { couponCode, cartTotal } = req.body;

    try {
        const coupon = await Coupon.findOne({ couponCode, isActive: true });  // Check if the coupon is active

        if (!coupon) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
        }

        if (cartTotal < coupon.minAmount) {  // Check if the cart total is greater than or equal to the minimum amount
            return res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: MESSAGES.BAD_REQUEST,
            });
        }

        // Check if coupon can still be used
        if (coupon.userUsed >= coupon.maxUsage) {
            return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
        }

        const discount = coupon.discount  // Check if the discount is less than or equal to the maximum discount
            ? (cartTotal * coupon.discount) / 100 
            : Math.min(cartTotal, coupon.maxDiscount);

        const discountedTotal = Math.max(cartTotal - discount, 0); // Ensure the discounted total is not negative

        req.session.appliedCoupon = {  // Store the applied coupon in the session
            couponCode: coupon.couponCode,
            discount,
        };

        // Decrease maxUsage by 1 after the coupon is applied
        coupon.userUsed += 1;
        coupon.maxUsage -= 1;
        await coupon.save(); // Save the updated coupon

        return res.status(STATUS_CODES.OK).json({
            success: true,
            message: MESSAGES.SUCCESS,
            discount,
            discountedTotal,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const removeCoupon = async (req, res) => {
    try {
        if (req.session.appliedCoupon) {  // Remove the applied coupon from the session
            const { couponCode } = req.session.appliedCoupon;

            // Find the coupon document and increment userUsed by 1
            const coupon = await Coupon.findOne({ couponCode });
            if (coupon) {
                coupon.userUsed -= 1; // Increment userUsed by 1 when coupon is removed
                coupon.maxUsage += 1;
                await coupon.save(); // Save the updated coupon
            }

            delete req.session.appliedCoupon; // Remove the coupon from the session
        }
        res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.SUCCESS });
    } catch (error) {
        console.error(error.message);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};





module.exports = {
    loadCoupon,
    loadAddCoupon,
    addCoupon,
    deleteCoupon,
    applyCoupon,
    removeCoupon
}