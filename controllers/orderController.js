const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel'); 

const getAllOrders = async (req, res) => {
    try {
        
        const orders = await Order.find().sort({ createdAt: -1 }).lean();

        if (!orders || orders.length === 0) {
            return res.render('admin/admin-orders', { orders: [], message: 'No orders found.' });
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
        }
             
        
        res.render('admin/orders', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('An error occurred while fetching orders.');
    }
};


const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Find the order by ID
        const order = await Order.findById(orderId).lean();

        if (!order) {
            return res.render('admin/order-detail', { order: null, message: 'Order not found.' });
        }

        // Find the user associated with the order
        const user = await User.findById(order.userId).lean();
        if (user) {
            order.user = user;
        }

        // Populate product details for each product in the order
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

        // Render the order detail page and include returnReason if it exists
        res.render('admin/order-detail', { order });
    } catch (error) {
        console.error('Error fetching order details:', error.message);
        res.status(500).send('An error occurred while fetching order details.');
    }
};



const updateOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body; 

        
        const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).send('Invalid status value');
        }

        
        const order = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true } 
        );

        if (!order) {
            console.log(`Order with ID ${orderId} not found.`);
            return res.status(404).send('Order not found');
        }

        console.log(`Order ${orderId} status updated to ${status}`);
        res.redirect('/admin/orders'); 
    } catch (error) {
        console.error('Error updating order status:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


// Approve Return
const approveReturn = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Find the order and update the return status to 'Approved'
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { returnStatus: 'Approved' }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.flash('success', 'Return approved successfully!');
        res.redirect(`/admin/order-detail/${orderId}`);
    } catch (error) {
        console.error('Error approving return:', error);
        req.flash('error', 'Failed to approve return. Please try again.');
        res.redirect('back');
    }
};

const rejectReturn = async (req, res) => {
    try {
        const orderId = req.params.id;

        // Find the order and update the return status to 'Rejected'
        const updatedOrder = await Order.findByIdAndUpdate(orderId, { returnStatus: 'Rejected' }, { new: true });

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        req.flash('success', 'Return rejected successfully!');
        res.redirect(`/admin/order-detail/${orderId}`);
    } catch (error) {
        console.error('Error rejecting return:', error);
        req.flash('error', 'Failed to reject return. Please try again.');
        res.redirect('back');
    }
};



module.exports = {
    getAllOrders,
    loadOrderDetails,
    updateOrderStatus,
    approveReturn,
    rejectReturn
};
