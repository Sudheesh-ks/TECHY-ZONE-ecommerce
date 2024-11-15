const isAuthenticated = (req, res, next) => {
    console.log(req.session.user)
    if (req.session?.user?.isAdmin == true) {
        next(); 
    } else {
        res.redirect('/admin/login'); 
    }
};


const isLogin = (req,res,next) => {
    if(!req.session?.user?.isAdmin){
        next();
    }else{
       return  res.redirect('/admin/dashboard')
    }
}

module.exports = {
    isAuthenticated,
    isLogin
}