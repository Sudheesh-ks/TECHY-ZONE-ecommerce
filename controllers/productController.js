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
  let {
    name,
    description,
    category,
    price,
    offerPrice,
    offerPercentage,
    stock,
    warranty,
    returnPolicy,
  } = req.body;

  price = Number(price);
  offerPrice = Number(offerPrice);
  stock = Number(stock);
  offerPrice = offerPrice === NaN ? 0 : offerPrice;

  try {
      
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ val: false, msg: "No files were uploaded" });
    }
    
    const categoryObject = await categoryModel.findOne({ name: category });
    if (!categoryObject) {
      return res.status(400).json({ val: false, msg: "Category not found" });
    }
    const imagePaths = [];
    for (const key in req.files) {
      
      req.files[key].forEach((file) => {
        imagePaths.push(
          path.relative(path.join(__dirname, "..", "public"), file.path)
        );
      });
    }
    

    console.log(imagePaths);
    console.log(warranty);
    
    await productModel.create({
      
      name,
      description,
      price,
      offerPrice: offerPrice,
      offerPercentage: offerPercentage,
      stock,
      category: categoryObject._id,
      images: imagePaths,
      warranty,
      returnPolicy,
    });
    
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

        {name:{$regex:new RegExp(".*"+search+".*","i")}},
      // {brand:{$regex:new RegExp(".*"+search+".*","i")}},
      ],
    }).limit(limit*1)
      .skip((page-1)*limit)
      .populate('category')
      .exec();

      const count = await productModel.countDocuments({
        $or:[
        {name:{$regex:new RegExp(".*"+search+".*","i")}},
        // {brand:{$regex:new RegExp(".*"+search+".*","i")}},
      ]
      });


      const category = await categoryModel.find({isListed:true});
      // const brand = await brand.find({isBlocked:false});

      if(category.length > 0){
        res.render('admin/products',{
          data:productData,
          currentPage:page,
          totalPages:Math.ceil(count/limit),
          cat:category,
        })
      }else{
        res.render("page-404");
      }

  } catch (error) {
    
    res.redirect("/pageerror");
  }
}


const blockProduct = async (req,res) => {

  try {

    let id = req.query.id;
    await productModel.updateOne({_id:id},{$set:{isDeleted:true}});
    res.redirect('/admin/products');
    
  } catch (error) {
    
    res.redirect('/pageerror')
  }
}

const unblockProduct = async (req,res) => {

  try {
    
    let id = req.query.id;
    await productModel.updateOne({_id:id},{isDeleted:false});
    res.redirect('/admin/products');
  } catch (error) {
    
    res.redirect('/pageerror');
  }
}


const getEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId).populate('category');
    const categories = await categoryModel.find({ isListed: true });

    if (!product) {
      return res.status(404).send('Product not found');
    }

    res.render('admin/edit-product', {
      product,
      cat: categories,
    });
  } catch (error) {
    console.error('Error fetching product for editing:', error);
    res.status(500).send('Internal Server Error');
  }
};


const updateProduct = async (req, res) => {

  console.log('dhhfhf')
  try {
    const productId = req.params.id;
    const {name, description, category, price, offerPrice, stock, warranty, returnPolicy} = req.body;
    const imagePaths = [];
    for (const key in req.files) {
      
      req.files[key].forEach((file) => {
        imagePaths.push(
          path.relative(path.join(__dirname, "..", "public"), file.path)
        );
      });
    }
    console.log(name, description, category, price, offerPrice, stock, warranty, returnPolicy)
    const product = await productModel.findOne({ _id: productId });
    
    if (!product) {
      return res.status(200).json({val:false,msg:"Product not found"});
    }
    
    await productModel.updateOne({ _id: productId }, {
      name,
      description,
      category: categoryObject._id,
      price,
      images: imagePaths,
      offerPrice,
      stock,
      warranty,
      returnPolicy,
    });

    return res.status(200).json({val:true,msg:"Product updated successfully",product});
  } catch (error) {
    console.error('Error fetching product for editing:', error);
    res.status(500).json({val:false,msg:"Internal server error"});
  }
};




module.exports = {
    getProductAddPage,
    productsAdd,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProductPage,
    updateProduct
}

