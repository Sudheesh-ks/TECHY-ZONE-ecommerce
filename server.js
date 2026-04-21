const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); 

console.log(process.env.MONGO_URI);
console.log(process.env.PORT);


const DB = require('./config/db');
DB();

const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');

const app = express();
const nocache = require('nocache');
const path = require('path');
const flash = require('connect-flash');


const authCheck = require('./middlewares/authCheck');
const banCheck = require('./middlewares/checkBan');

app.use(express.json())
app.use(express.urlencoded({extended:true}))

// -----dev-----
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'default_secret', 
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 1000*60*60*24 }
// }));

// ----production-----
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false, 
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: isProd,               
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax'
    }
}));

app.use(nocache());


app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.flash = req.flash();
  next();
});


app.use(express.static(path.join(__dirname,'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,'views'));

app.use(authCheck);
app.use(banCheck);

// for user routes
const userRoute = require('./routes/userRoute');
app.use('/',userRoute);


const adminRoute = require('./routes/adminRoute');  
// for admin routes
app.use('/admin',adminRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).send("Internal Server Error: " + err.message);
});



const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
})