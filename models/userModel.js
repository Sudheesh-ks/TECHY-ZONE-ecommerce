const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({


    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true
    },

    phno:{
        type:String,
        required:false,
        default:null
    },

    isGoogleAuth: { 
        type: Boolean, 
        default: false 
    },

    googleId : {
        type: String,
        unique: true
    },

    password:{
        type:String,
        required:false
    },

    isAdmin : {
        type: Boolean,
        default:false
    },

    isBlocked: {
        type : Boolean,
        default:false
    },

});


module.exports = mongoose.model('User' , userSchema)