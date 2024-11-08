const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next(); 
    } else {
        res.redirect('/login'); 
    }
};

const isLogin = (req,res,next) => {
    if(!req.session.user){
        next();
    }else{
        res.redirect('/')
    }
}

module.exports = {
    isAuthenticated,
    isLogin
}
