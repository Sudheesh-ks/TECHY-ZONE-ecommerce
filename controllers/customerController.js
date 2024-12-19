const User = require('../models/userModel');



const customerInfo = async (req,res) => {

    try{

        let search = "";  // implementing search
        if(req.query.search){
            search=req.query.search;
        }
        let page = 1;  // implementing pagination
        if(req.query.page){
            page = req.query.page
        }
        const limit = 3
        const userData = await User.find ({  
            isAdmin:false,
            $or: [
                { name: { $regex: ".*" + search + ".*"}},
                { email: {$regex: ".*" + search + ".*"}}
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count = await User.find({ isAdmin:false,
            $or: [
                { name: { $regex: ".*" + search + ".*"}},
                { email: {$regex: ".*" + search + ".*"}}
            ],
        }).countDocuments();

        res.render('admin/customers',{
            data:userData,
            totalPages:Math.ceil(count/limit),
            currentPage:page
        })

    }catch(error){
            res.redirect('/pageerror');
    }
};

const customerBlocked = async (req,res) => {

    try{

        let id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});  // updating isBlocked to true
        res.redirect('/admin/users')
    }catch(error){
        res.redirect('/pageerror');
    }
}


const customerunBlocked = async (req,res) => {

    try{

        let id = req.query.id;
        console.log(id);
        
        await User.updateOne({_id:id},{$set:{isBlocked:false}}); // updating isBlocked to false
        res.redirect('/admin/users')
    }catch(error){
        res.redirect('/pageerror');
    }
}


module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
}