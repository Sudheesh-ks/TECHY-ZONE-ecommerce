const mongoose = require("mongoose");
const env = require('dotenv').config();
console.log(process.env.MONGO_URI);


//mongodb connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {}); 
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

module.exports = connectDB;