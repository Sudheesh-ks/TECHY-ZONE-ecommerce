let authCheck = (req,res,next) => {
    // console.log("authCheck Middleware: ", req.url);

    if(['/myaccount','/wishlist','/shopping-cart'].includes(req.url)){
        if(!req.session.user){
            // console.log("Redirecting to /registration from authCheck");
            return res.redirect('/register');
            
        }
        return next();
    }else if(['/registration','/login'].includes(req.url)){
        if(req.session.user){
            // console.log("Redirecting to / from authCheck");
            return res.redirect('/');
        }
        return next();
    }
    return next();
    
}

module.exports = authCheck;