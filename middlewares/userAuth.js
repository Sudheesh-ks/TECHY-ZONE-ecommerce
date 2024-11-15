const isUserAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); 
    } else {
       return  res.redirect('/login'); 
    }
    next()
};

const isUserLogin = (req,res,next) => {
    if(!req.session.user){
        next();
    }else{
       return  res.redirect('/')
    }
    next()
}

module.exports = {
    isUserAuthenticated,
    isUserLogin
}