const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/Techy-Zone");

const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const dotenv = require('dotenv');
dotenv.config(); 
const path = require('path');
const app = express();
const nocache = require('nocache');



app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(nocache());

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret', 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}));


app.use(passport.initialize());
app.use(passport.session());


app.use(express.static(path.join(__dirname,'public')))

app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,'views'));

// for user routes
const userRoute = require('./routes/userRoute');
app.use('/',userRoute);


const adminRoute = require('./routes/adminRoute');  
// for admin routes
app.use('/admin',adminRoute);



app.listen(4001, () => {
    console.log("Server is running on port 4001");
    
})