const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const moment  = require('moment'); // For date and Time formating
const fs = require('fs');
const path = require('path');
const { log } = require('console');
const ExcelJS = require('exceljs');
const pdf = require('html-pdf');



const loadLogin = (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {  // Check if admin is already logged in
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/admin-login', { message: null });
  };

  
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true }); // Finding admin by email
    if (!admin) {
      console.log("Admin not found");
      return res.render('admin/admin-login', { message: 'Invalid login credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (passwordMatch) {
     req.session.user = { // Setting session for admin
      id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin:admin.isAdmin
    };
      return res.redirect('/admin/dashboard'); 

    } else {
      console.log("Incorrect password");
      return res.render('admin/admin-login', { message: 'Incorrect password' });
    }
  } catch (error) {
    console.error("Login error:", error);
  }
};
  
const loadDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments(); // Counting total users
        const totalProducts = await Product.countDocuments(); // Counting total products
        const totalOrders = await Order.countDocuments();  // Counting total orders

        const totalSales = await Order.aggregate([
            { $match: { paymentStatus: 'Completed' } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } } // Calculating total sales
        ]);
        const totalSalesValue = totalSales.length > 0 ? totalSales[0].total : 0;  // Extracting total sales value

        const filter = req.query.filter || 'daily';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

        if (filter === 'custom' && startDate && endDate && startDate > endDate) {  // Checking if start date is before end date
            throw new Error("Invalid date range: Start date must be before End date.");
        }

        let matchCriteria = { paymentStatus: 'Completed' };
        const now = new Date();

        if (filter === 'daily') {
            matchCriteria.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) }; // Setting start time to 00:00:00
        } else if (filter === 'weekly') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));  // Setting start of the week
            matchCriteria.createdAt = { $gte: startOfWeek };
        } else if (filter === 'monthly') {
            matchCriteria.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };  // Setting start of the month
        } else if (filter === 'custom' && startDate && endDate) {  // Setting custom date range
            matchCriteria.createdAt = { $gte: startDate, $lte: endDate };
        }

        const topProductsData = await Order.aggregate([  // Aggregating top 10 sold products
            { $match: matchCriteria },
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.productId",
                    totalSold: { $sum: "$products.quantity" },
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            {
                $project: {
                    productName: { $arrayElemAt: ["$productInfo.name", 0] },
                    totalSold: 1
                }
            }
        ]);

        const topCategoriesData = await Order.aggregate([  // Aggregating top 10 sold categories
            { $match: matchCriteria },
            { $unwind: "$products" },
            {
                $lookup: {
                    from: "products",
                    localField: "products.productId",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $group: {
                    _id: "$productInfo.category",
                    totalSold: { $sum: "$products.quantity" },
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            {
                $project: {
                    categoryName: { $arrayElemAt: ["$categoryInfo.name", 0] },
                    totalSold: 1
                }
            }
        ]);

        const productLabels = topProductsData.map(data => data.productName || "Unknown Product");
        const productValues = topProductsData.map(data => data.totalSold);


        const categoryLabels = topCategoriesData.map(data => data.categoryName || "Unknown Category");
        const categoryValues = topCategoriesData.map(data => data.totalSold);

        res.render('admin/dashboard', {
            totalUsers,
            totalProducts,
            totalOrders,
            totalSales: totalSalesValue,
            filter,
            salesData: {
                labels: productLabels,
                values: productValues
            },
            categoryData: {
                labels: categoryLabels,
                values: categoryValues
            },
            startDate: req.query.startDate || '',
            endDate: req.query.endDate || ''
        });
    } catch (error) {
        console.error("Error loading dashboard:", error.message);
        res.status(500).send("Internal Server Error. Please try again later.");
    }
};




const loadSalesData = async (req, res) => {
    try {
        const { filter, startDate, endDate, page = 1, limit = 10 } = req.query;
        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(limit);

        // Sales Data Filter
        let filterCondition = {};
        if (filter === 'daily') {
            filterCondition = { createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } };
        } else if (filter === 'weekly') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filterCondition = { createdAt: { $gte: oneWeekAgo } };
        } else if (filter === 'monthly') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            filterCondition = { createdAt: { $gte: oneMonthAgo } };
        } else if (filter === 'custom' && startDate && endDate) {
            filterCondition = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        }

        // Fetching filtered order data
        const totalOrders = await Order.countDocuments(filterCondition);
        const orders = await Order.find(filterCondition)
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .populate('userId', 'name')
            .select('userId products paymentMethod totalPrice createdAt');

        res.render('admin/salesData', {
            orders,
            filter,
            startDate,
            endDate,
            currentPage,
            totalPages: Math.ceil(totalOrders / itemsPerPage),
            limit,
            totalOrders,
        });
    } catch (error) {
        console.error("Error loading sales data:", error.message);
        res.status(500).send("An error occurred while loading the sales data.");
    }
};

// Conttroller to export data to PDF
const exportSalesToPDF = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;

        // Apply filter logic
        let filterCondition = {};
        if (filter === 'daily') {
            filterCondition = { createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } };
        } else if (filter === 'weekly') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filterCondition = { createdAt: { $gte: oneWeekAgo } };
        } else if (filter === 'monthly') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            filterCondition = { createdAt: { $gte: oneMonthAgo } };
        } else if (filter === 'custom' && startDate && endDate) {
            filterCondition = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        }

        const orders = await Order.find(filterCondition)
            .sort({ createdAt: -1 })
            .populate('userId', 'name')
            .select('userId products paymentMethod totalPrice createdAt');

        if (orders.length === 0) {
            return res.status(404).send('No data available to export.');
        }

        // HTML Design for PDF
        const html = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                    th { background-color: #f4f4f4; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    tr:hover { background-color: #f1f1f1; }
                </style>
            </head>
            <body>
                <h2 style="text-align: center;">Sales Report TECHY ZONE</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>User Name</th>
                            <th>Products</th>
                            <th>Payment Method</th>
                            <th>Total Price</th>
                            <th>Order Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>#${order._id.toString().slice(-6)}</td>
                                <td>${order.userId.name}</td>
                                <td>${order.products.map(product => product.name).join(', ')}</td>
                                <td>${order.paymentMethod}</td>
                                <td>₹${order.totalPrice.toFixed(2)}</td>
                                <td>${order.createdAt.toISOString().split('T')[0]}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        // Creating the PDF from the HTML
        pdf.create(html, { format: 'A4' }).toStream((err, stream) => {
            if (err) {
                console.error('Error generating PDF:', err.message);
                return res.status(500).send('An error occurred while generating the PDF.');
            }
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
            res.setHeader('Content-Type', 'application/pdf');
            stream.pipe(res);
        });
    } catch (error) {
        console.error('Error exporting sales data to PDF:', error.message);
        res.status(500).send('An error occurred while exporting the sales data.');
    }
};

// Controller to export data to Excel
const exportSalesToExcel = async (req, res) => {
    try {
        const { filter, startDate, endDate } = req.query;

        // Filtering for the Excel exporting
        let filterCondition = {};
        if (filter === 'daily') {
            filterCondition = { createdAt: { $gte: new Date().setHours(0, 0, 0, 0) } };
        } else if (filter === 'weekly') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filterCondition = { createdAt: { $gte: oneWeekAgo } };
        } else if (filter === 'monthly') {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            filterCondition = { createdAt: { $gte: oneMonthAgo } };
        } else if (filter === 'custom' && startDate && endDate) {
            filterCondition = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
        }

        const orders = await Order.find(filterCondition)
            .sort({ createdAt: -1 })
            .populate('userId', 'name')
            .select('userId products paymentMethod totalPrice createdAt');

        if (orders.length === 0) {
            return res.status(404).send('No data available to export.');
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'User Name', key: 'userName', width: 20 },
            { header: 'Products', key: 'products', width: 30 },
            { header: 'Payment Method', key: 'paymentMethod', width: 15 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Total Price', key: 'totalPrice', width: 15 },
        ];

        orders.forEach(order => {
            worksheet.addRow({
                orderId: "#" + order._id.toString().slice(-6),
                userName: order.userId.name,
                products: order.products.map(product => product.name).join(', '),
                paymentMethod: order.paymentMethod,
                date: order.createdAt.toISOString().split('T')[0],
                totalPrice: order.totalPrice,
            });
        });

        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Error exporting sales data to Excel:", error.message);
        res.status(500).send("An error occurred while exporting the sales data.");
    }
};
 


const logout = async(req,res) => {
  try {
    
      req.session.destroy(err => {
        if(err){
          console.log("Error destroying session",err);
          }
          res.redirect('/admin/login')
      })

  } catch (error) {

    console.log("Unexpected error during logout",error);
    
  }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    logout,
    loadSalesData,
    exportSalesToPDF,
    exportSalesToExcel
}