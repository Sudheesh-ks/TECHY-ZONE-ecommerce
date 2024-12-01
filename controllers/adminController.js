const User = require('../models/userModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const moment  = require('moment');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { log } = require('console');



const pageerror = async(req,res) => {

  res.render('admin/admin-error');

}


const loadLogin = (req, res) => {
    if (req.session.user && req.session.user.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    // }else if(!req.session.user.isAdmin){
    //   return res.redirect('/')
    // }
    res.render('admin/admin-login', { message: null });
  };

  
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      console.log("Admin not found or invalid credentials");
      return res.render('admin/admin-login', { message: 'Invalid login credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (passwordMatch) {
     // req.session.user = true; 
     req.session.user = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      isAdmin:admin.isAdmin
    };
    console.log("sessionsetted",req.session.user);

      console.log("Session admin set to:", req.session.admin); 
      return res.redirect('/admin/dashboard'); 
    } else {
      console.log("Incorrect password");
      return res.render('admin/admin-login', { message: 'Incorrect password' });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.redirect('/pageerror');
  }
};
  
const loadDashboard = async (req, res) => {
  try {
      
      const totalUsers = await User.countDocuments();
      const totalProducts = await Product.countDocuments();
      const totalOrders = await Order.countDocuments();

      const totalSales = await Order.aggregate([
          { $match: { paymentStatus: 'Completed' } },
          { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]);
      const totalSalesValue = totalSales.length > 0 ? totalSales[0].total : 0;

      const filter = req.query.filter || 'daily';
      const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

      if (filter === 'custom' && startDate && endDate && startDate > endDate) {
          throw new Error("Invalid date range: Start date must be before End date.");
      }

      let matchCriteria = { paymentStatus: 'Completed' };
      const now = new Date();

      if (filter === 'daily') {
          matchCriteria.createdAt = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
      } else if (filter === 'weekly') {
          const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
          matchCriteria.createdAt = { $gte: startOfWeek };
      } else if (filter === 'monthly') {
          matchCriteria.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
      } else if (filter === 'custom' && startDate && endDate) {
          matchCriteria.createdAt = { $gte: startDate, $lte: endDate };
      }

      const topProductsData = await Order.aggregate([
          { $match: matchCriteria },
          { $unwind: "$products" }, 
          {
              $group: {
                  _id: "$products.productId",
                  totalSold: { $sum: "$products.quantity" }, 
                  totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } } 
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
                  totalSold: 1,
                  totalRevenue: 1
              }
          }
      ]);

      const productLabels = topProductsData.map(data => data.productName || "Unknown Product");
      const productValues = topProductsData.map(data => data.totalSold);
      const revenueValues = topProductsData.map(data => data.totalRevenue);

      res.render('admin/dashboard', {
          totalUsers,
          totalProducts,
          totalOrders,
          totalSales: totalSalesValue,
          filter, 
          salesData: {
              labels: productLabels,
              values: productValues,
              revenueValues 
          },
          startDate: req.query.startDate || '',
          endDate: req.query.endDate || ''
      });
  } catch (error) {
      console.error("Error loading dashboard:", error.message);
      res.status(500).send("Internal Server Error. Please try again later.");
  }
};


const generateSalesReport = async (req, res) => {
  try {
      
      const salesData = await Order.find({}).lean(); 

      if (salesData.length === 0) {
          return res.status(404).send('No sales data found.');
      }

      const reportsDir = path.join(__dirname, '../public/reports');
      if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
      }

      const filePath = path.join(reportsDir, 'sales-report.pdf');
      const doc = new PDFDocument();

      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(20).text('Sales Report', { align: 'center' }).moveDown();
      const currentDate = new Date().toLocaleDateString();
      doc.fontSize(12).text(`Generated on: ${currentDate}`).moveDown(2);

      const tableHeaders = ['Product Name', 'Units Sold', 'Total Revenue (₹)'];
      const headerWidth = [150, 80, 120]; 

      doc.fontSize(14).font('Helvetica-Bold');
      tableHeaders.forEach((header, i) => {
          doc.text(header, 50 + (i * headerWidth[i]), doc.y, { width: headerWidth[i], align: 'center' });
      });
      doc.moveDown();

      const productDataMap = {};

      salesData.forEach((order) => {
          order.products.forEach((product) => {
              const productName = product.name || 'Unnamed Product';
              const productRevenue = product.price * product.quantity;

              if (!productDataMap[productName]) {
                  productDataMap[productName] = {
                      unitsSold: 0,
                      totalRevenue: 0
                  };
              }

              productDataMap[productName].unitsSold += product.quantity;
              productDataMap[productName].totalRevenue += productRevenue;
          });
      });

      doc.fontSize(12).font('Helvetica');
      Object.keys(productDataMap).forEach((productName) => {
          const { unitsSold, totalRevenue } = productDataMap[productName];

          doc.text(productName, 50, doc.y, { width: headerWidth[0], align: 'center' });
          doc.text(unitsSold, 50 + headerWidth[0], doc.y, { width: headerWidth[1], align: 'center' });
          doc.text(totalRevenue.toLocaleString(), 50 + headerWidth[0] + headerWidth[1], doc.y, { width: headerWidth[2], align: 'center' });
          doc.moveDown();
      });

      doc.end();

      res.download(filePath, 'sales-report.pdf', (err) => {
          if (err) {
              console.error('Error downloading file:', err);
              res.status(500).send('Could not download the file.');
          }
      });
  } catch (error) {
      console.error('Error generating sales report:', error.stack);
      res.status(500).send('Failed to generate sales report.');
  }
};




const logout = async(req,res) => {
  try {
    
      req.session.destroy(err => {
        if(err){
          console.log("Error destroying session",err);
          return res.redirect('/pageerror');
          }
          res.redirect('/admin/login')
      })

  } catch (error) {

    console.log("Unexpected error during logout",error);
    res.redirect('/pageerror')
    
  }
}


module.exports = {
    loadLogin,
    login,
    loadDashboard,
    generateSalesReport,
    pageerror,
    logout,
}