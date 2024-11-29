const Coupon = require('../models/couponModel');


const loadCoupon = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ expiryDate: -1 });
        res.render('admin/coupon', { coupons });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const loadAddCoupon = async (req,res) => {
    try {
        res.render('admin/addCoupon');
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}



const addCoupon = async (req, res) => {
    try {
        const { couponCode, discount, minAmount, expiryDate, maxDiscount, maxUsage} = req.body;

        // Validate the required fields
        if (!couponCode || !discount || !minAmount || !expiryDate) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if the coupon code already exists
        const existingCoupon = await Coupon.findOne({ couponCode });
        if (existingCoupon) {
            return res.status(400).json({ error: 'Coupon code already exists.' });
        }

        // Save the new coupon
        const coupon = new Coupon({
            couponCode,
            discount,
            minAmount,
            maxDiscount,
            maxUsage,
            expiryDate,
        });

        await coupon.save();

        res.status(200).json({ message: 'Coupon added successfully.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;

        const coupon = await Coupon.findByIdAndDelete(id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found.' });
        }

        res.status(200).json({ message: 'Coupon deleted successfully.' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const applyCoupon = async (req, res) => {
    const { couponCode, cartTotal } = req.body;

    try {
        // Find active coupon
        const coupon = await Coupon.findOne({ couponCode, isActive: true });

        if (!coupon) {
            return res.status(400).json({ success: false, message: "Invalid or expired coupon." });
        }

        // Check minimum spend
        if (cartTotal < coupon.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Coupon requires a minimum spend of $${coupon.minAmount}.`,
            });
        }

        // Calculate discount
        const discount = coupon.discount 
            ? (cartTotal * coupon.discount) / 100 
            : Math.min(cartTotal, coupon.maxDiscount);

        const discountedTotal = Math.max(cartTotal - discount, 0); // Ensure no negative prices

        // Store applied coupon details in session
        req.session.appliedCoupon = {
            couponCode: coupon.couponCode,
            discount,
        };

        return res.status(200).json({
            success: true,
            message: "Coupon applied successfully!",
            discount,
            discountedTotal,
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ success: false, message: "Server error. Try again later." });
    }
};



const removeCoupon = (req, res) => {
    try {
        if (req.session.appliedCoupon) {
            delete req.session.appliedCoupon;
        }
        res.status(200).json({ success: true, message: "Coupon removed successfully." });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: "Server error. Try again later." });
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