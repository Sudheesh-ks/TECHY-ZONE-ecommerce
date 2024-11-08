const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const User = require('../models/userModel');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const getProductAddPage = async (req,res) => {
    
    try {
        
        const category = await categoryModel.find({isListed:true});
        res.render('admin/product-add',{
            cat:category
        })
    } catch (error) {
        console.log(error)
        res.redirect('/pageerror');
        
    }
}

const productsAdd = async (req, res) => {
    console.log('yssdbhsbhdfbshdhd ')
    let {
      name,
      description,
      category,
      price,
      cashOnDelivery,
      offerPrice,
      stock,
      warranty,
      returnPolicy,
    } = req.body;

    price = Number(price);
    offerPrice = Number(offerPrice);
    stock = Number(stock);
    cashOnDelivery = cashOnDelivery === "true";
    offerPrice = offerPrice === NaN ? 0 : offerPrice;

    try {
        console.log("1");
        
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ val: false, msg: "No files were uploaded" });
      }
      console.log("2");
      
      const categoryObject = await categoryModel.findOne({ name: category });
      if (!categoryObject) {
        return res.status(400).json({ val: false, msg: "Category not found" });
      }
      const imagePaths = [];
      for (const key in req.files) {
        console.log("3");
        
        req.files[key].forEach((file) => {
          imagePaths.push(
            path.relative(path.join(__dirname, "..", "public"), file.path)
          );
        });
      }
      console.log("4");
      

      console.log(imagePaths);
      console.log(warranty);
      console.log("5");
      
      await productModel.create({
        
        name,
        description,
        price,
        offerPrice: offerPrice,
        stock,
        category: categoryObject._id,
        images: imagePaths,
        cashOnDelivery,
        warranty,
        returnPolicy,
      });
      console.log("6");
      
      res.status(200).json({ val: true, msg: "Upload successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ val: false, msg: "Internal server error" });
    }
  }  


const getAllProducts = async (req,res) => {
    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await productModel.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
                // {brand:{$regex :new RegExp(".*"+search+".*","i")}},
            ],
        })
        .limit(limit*1)
        .skip((page-1)*limit)
        .populate('category')
        .exec()


        const count = await productModel.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
        }).countDocuments();

        const category = await categoryModel.find({isListed:true});
        // const brand = await Brand.find({isBlocked:false});

        if(category){
            res.render('admin/products',{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,
                // brand:brand,
            })
        }else{
            res.render('page-404');
        }
        
    } catch (error) {

        console.log(error)
        res.redirect('/pageerror');
        
    }
}

module.exports = {
    getProductAddPage,
    productsAdd,
    getAllProducts,
    
}

