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
    createdAt: {
        type: Date,
        default:Date.now
    },
    status: {
        type: String,
        enum: ["Listed", "Unlisted"],
        default: "Listed" 
    },
    categoryOffer: {
        type: Number, // The percentage or fixed amount of the offer
        default: 0,
    },

})



module.exports = mongoose.model("Category",categorySchema);