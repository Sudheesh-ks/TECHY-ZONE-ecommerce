const userModel = require('../models/userModel');

let checkBan = async (req, res, next) => {
    console.log('Ban trigered');

    if (req.session.user) { 
        const session = req.session.user;
        console.log(session.email); 

        const user = await userModel.findOne({ email: session.email });

        if (user && user.isBlocked) {
            return res.render('users/user-ban');
        }

        return next(); 
    }
    return next();
}

module.exports = checkBan ;
