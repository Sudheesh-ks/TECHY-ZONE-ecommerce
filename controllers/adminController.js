const User = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');



const pageerror = async(req,res) => {

  res.render('admin/admin-error');

}


const loadLogin = (req, res) => {
    if (req.session.admin) {
      return res.redirect('/admin/dashboard');
    }
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
      req.session.admin = true; 
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
  
const loadDashboard = (req, res) => {
  console.log("Session admin status in loadDashboard:", req.session.admin); 
  if (req.session.admin) {
    return res.render('admin/dashboard');
  }
  res.redirect('/admin/login'); 
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
    pageerror,
    logout,
}