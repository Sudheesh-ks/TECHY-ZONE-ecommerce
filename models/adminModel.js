const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: true }
});


module.exports = mongoose.model('Admin', adminSchema, 'admins');
