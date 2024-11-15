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

})



module.exports = mongoose.model("Category",categorySchema);