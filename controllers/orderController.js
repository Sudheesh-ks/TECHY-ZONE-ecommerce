const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel'); 
const Wallet = require('../models/walletModel');

const getAllOrders = async (req, res) => {
    try {

        let search = "";  // implementing search
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;  // implementing pagination
        if (req.query.page) {
            page = parseInt(req.query.page);
        }
        const limit = 4; 

        const count = await Order.countDocuments();
        
        const orders = await Order.find().sort({ createdAt: -1 }).lean()  // Fetching all orders
        .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .lean();

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

            order.isReturnRequested = order.returnStatus === 'Requested';
        }
             
        
        res.render('admin/orders', 
            { orders,
              totalPages: Math.ceil(count / limit),
              currentPage: page,
            },
        );
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('An error occurred while fetching orders.');
    }
};


const loadOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId).lean(); // Fetching order details

        if (!order) {
            return res.render('admin/order-detail', { order: null, message: 'Order not found.' });
        }

        const user = await User.findById(order.userId).lean();
        if (user) {
            order.user = user;
        }

        for (let item of order.products) {
            const product = await Product.findById(item.productId).lean();  // Fetching product details
            if (product) {
                item.productDetails = {
                    name: product.name,
                    offerPrice: product.offerPrice,
                    price: product.price,
                    images: product.images[0],
                };
            }
        }

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

        
        const order = await Order.findByIdAndUpdate(  // Updating order status
            orderId,
            { status },
            { new: true } 
        );

        if (!order) {
            console.log(`Order with ID ${orderId} not found.`);
            return res.status(404).send('Order not found');
        }

         order.status = status;

         if (status === 'Delivered') {  // Updating payment status
             order.paymentStatus = 'Completed';
         }
 
         await order.save();
 
         console.log(`Order ${orderId} status updated to ${status}`);
         if (status === 'Delivered' && order.paymentMethod === 'COD') {  // Updating payment status
             console.log(`Payment status for order ${orderId} updated to Completed.`);
         }

        console.log(`Order ${orderId} status updated to ${status}`);
        res.redirect('/admin/orders'); 
    } catch (error) {
        console.error('Error updating order status:', error.message);
        res.status(500).send('Internal Server Error');
    }
};


const approveReturn = async (req, res) => {
    try {
        const orderId = req.params.id;

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { returnStatus: 'Approved', status: 'Returned' }, { new: true });  // Updating return status

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

         const userId = updatedOrder.userId;
         const refundAmount = updatedOrder.totalPrice;
 
         let wallet = await Wallet.findOne({ userId });
 
         if (!wallet) {  
             wallet = new Wallet({
                 userId,
                 balance: refundAmount,
                 transactions: [
                     {
                         amount: refundAmount,
                         type: 'Credit',
                         description: `Refund for returned order ${orderId}`,
                     },
                 ],
             });
         } else {
             wallet.balance += refundAmount;  // Adding refund amount
             wallet.transactions.push({
                 amount: refundAmount,
                 type: 'Credit',
                 description: `Refund for returned order ${orderId}`,
             });
         }
 
         await wallet.save();
 
         console.log(`Refund of ₹${refundAmount} credited to wallet for user ${userId}.`);

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


const approveProductReturn = async (req, res) => {
    const { id: orderId, productId } = req.params;

    try {
        
        const order = await Order.findById(orderId);
        if (!order) {
            req.flash('error', 'Order not found');
            return res.redirect('back');
        }

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product || product.returnStatus !== 'Requested') {
            req.flash('error', 'Invalid product return request');
            return res.redirect('back');
        }

        product.returnStatus = 'Approved';
        product.returnApprovedAt = new Date();

        const refundAmount = product.price * product.quantity;

        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: refundAmount,
                transactions: [
                    {
                        amount: refundAmount,
                        type: 'Credit',
                        description: `Refund for returned product ${productId} in order ${orderId}`,
                    },
                ],
            });
        } else {
            wallet.balance += refundAmount; // Adding refund amount
            wallet.transactions.push({
                amount: refundAmount,
                type: 'Credit',
                description: `Refund for returned product ${productId} in order ${orderId}`,
            });
        }

        await wallet.save();

        const allApproved = order.products.every(p => p.returnStatus === 'Approved');
        if (allApproved) {
            order.status = 'Returned';
        }


        await order.save();

        req.flash('success', 'Product return approved and wallet credited successfully!');
        res.redirect(`/admin/order-detail/${orderId}`);
    } catch (error) {

        console.error('Error approving return:', error);
        req.flash('error', 'Failed to approve return. Please try again.');
        res.redirect('back');
    }
};



const rejectProductReturn = async (req, res) => {
    try {
        const { id: orderId, productId } = req.params;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = order.products.find(p => p.productId.toString() === productId); // Finding the product
        if (!product || product.returnStatus !== 'Requested') {
            return res.status(400).json({ message: 'Invalid product return request' });
        }

        product.returnStatus = 'Rejected'; // Updating return status

        await order.save();

        res.redirect(`/admin/order-detail/${orderId}`);
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    getAllOrders,
    loadOrderDetails,
    updateOrderStatus,
    approveReturn,
    rejectReturn,
    approveProductReturn,
    rejectProductReturn
};
