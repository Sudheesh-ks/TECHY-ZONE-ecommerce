const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({

    name: {
        type:String,
        required:true,
        unique:true
    },
    description : {
        type : String,
        required : true,
    },
    isListed: {
        type:Boolean,
        default:true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt: {
        type: Date,
        default:Date.now
    },
    offerPrice: { 
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ["Listed", "Unlisted"],
        default: "Listed" 
    },

})



module.exports = mongoose.model("Category",categorySchema);