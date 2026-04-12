const productModel = require('../models/productModel');
const categoryModel = require('../models/categoryModel');
const User = require('../models/userModel');
const path = require('path');


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
    
    const categoryObject = await categoryModel.findOne({ name: category }); // Checking if category exists
    if (!categoryObject) {
      return res.status(400).json({ val: false, msg: "Category not found" });
    }
    const imagePaths = [];
    for (const key in req.files) { // Looping through the uploaded files
      
      req.files[key].forEach((file) => {
        imagePaths.push(file.path);
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

        {name:{$regex:new RegExp(".*"+search+".*","i")}},  // searching by name
      ],
    }).limit(limit*1)
      .skip((page-1)*limit)
      .sort({createdAt:-1})
      .populate('category')
      .exec();

      const count = await productModel.countDocuments({  // Counting the number of products
        $or:[
        {name:{$regex:new RegExp(".*"+search+".*","i")}},
      ]
      });


      const category = await categoryModel.find({isListed:true});  // Fetching all categories

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
  try {
    console.log('Starting product update...');
    
    const productId = req.params.id;
    console.log('Product ID:', productId);

    if (!productId) {
      console.log('Invalid Product ID');
      return res.status(400).json({ val: false, msg: "Invalid Product ID" });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      console.log(`Product with ID ${productId} not found`);
      return res.status(404).json({ val: false, msg: "Product not found" });
    }
    console.log('Product found:', product);

    let categoryData;
    if (req.body.category) {
      categoryData = await categoryModel.findOne({ name: req.body.category });
      if (!categoryData) {
        console.log(`Category ${req.body.category} not found`);
        return res.status(404).json({ val: false, msg: `Category ${req.body.category} not found` });
      }
      console.log('Category validated:', categoryData);
    }

    let finalImages = [...product.images]; // Start with existing images

    // Update images where new files are provided
    for (let i = 1; i <= 3; i++) {
      const fieldName = `croppedImage${i}`;
      const file = req.files.find(f => f.fieldname === fieldName);
      if (file) {
        console.log(`Updating image ${i} with new file: ${file.path}`);
        finalImages[i - 1] = file.path;
      }
    }

    console.log('Final Images:', finalImages);

    // Handle form fields with fallbacks
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.category = categoryData ? categoryData._id : product.category;
    product.price = req.body.price ? parseFloat(req.body.price) : product.price;
    product.offerPrice = req.body.offerPrice ? parseFloat(req.body.offerPrice) : product.offerPrice;
    product.stock = req.body.stock ? parseInt(req.body.stock) : product.stock;
    product.warranty = req.body.warranty && req.body.warranty !== 'null' ? req.body.warranty : product.warranty;
    product.returnPolicy = req.body.returnPolicy && req.body.returnPolicy !== 'null' ? req.body.returnPolicy : product.returnPolicy;
    product.images = finalImages;

    await product.save();

    return res.json({ success: true, message: "Product updated successfully!" });
  } catch (error) {
    console.error("Error in updateProduct controller:", error);
    return res.status(500).json({ val: false, msg: "Internal server error", error: error.message });
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

