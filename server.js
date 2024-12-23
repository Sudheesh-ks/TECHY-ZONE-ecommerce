const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI);

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


app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret', 
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000*60*60*24 }
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



app.listen(3000, () => {
    console.log("Server is running on port 3000");
    
})