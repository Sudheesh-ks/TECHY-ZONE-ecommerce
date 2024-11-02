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
        type:Number,
        required:false,
        sparse:true,
        default:null
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
    }

});


module.exports = mongoose.model('User' , userSchema)