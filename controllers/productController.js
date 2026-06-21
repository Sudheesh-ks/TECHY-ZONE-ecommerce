const productModel = require("../models/productModel");
const categoryModel = require("../models/categoryModel");
const User = require("../models/userModel");
const path = require("path");
const STATUS_CODES = require("../constants/status.constants");
const MESSAGES = require("../constants/responseMessage");

const getProductAddPage = async (req, res) => {
  try {
    const category = await categoryModel.find({ isListed: true });
    res.render("admin/product-add", {
      cat: category,
    });
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
    res.redirect("/pageerror");
  }
};

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
  if (Number.isNaN(offerPrice)) offerPrice = 0;

  if (Number.isNaN(price) || Number.isNaN(stock)) {
    return res
      .status(STATUS_CODES.BAD_REQUEST)
      .json({ success: false, message: "Invalid price or stock value" });
  }

  try {
    const hasFiles =
      req.files &&
      Object.values(req.files).some(
        (fileArray) => Array.isArray(fileArray) && fileArray.length > 0,
      );

    if (!hasFiles) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "No files were uploaded" });
    }

    const categoryObject = await categoryModel.findById(category);
    if (!categoryObject) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Category not found" });
    }
    const imagePaths = [];
    for (const key in req.files) {
      // Looping through the uploaded files

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

    res.status(STATUS_CODES.OK).json({ val: true, msg: "Upload successful" });
  } catch (err) {
    console.error(err);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;

    const productData = await productModel
      .find({
        $or: [
          { name: { $regex: new RegExp(".*" + search + ".*", "i") } }, // searching by name
        ],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate("category")
      .exec();

    const count = await productModel.countDocuments({
      // Counting the number of products
      $or: [{ name: { $regex: new RegExp(".*" + search + ".*", "i") } }],
    });

    const category = await categoryModel.find({ isListed: true }); // Fetching all categories

    if (category.length > 0) {
      res.render("admin/products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
    res.redirect("/pageerror");
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await productModel.updateOne({ _id: id }, { $set: { isDeleted: true } });
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await productModel.updateOne({ _id: id }, { isDeleted: false });
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: error.message || MESSAGES.INTERNAL_SERVER_ERROR,
      });
    res.redirect("/pageerror");
  }
};

const getEditProductPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await productModel.findById(productId).populate("category");
    const categories = await categoryModel.find({ isListed: true });

    if (!product) {
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: "Product not found" });
    }

    res.render("admin/edit-product", {
      product,
      cat: categories,
    });
  } catch (error) {
    console.error("Error fetching product for editing:", error);
    res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal Server Error" });
  }
};

const updateProduct = async (req, res) => {
  try {
    console.log("Starting product update...");

    const productId = req.params.id;
    console.log("Product ID:", productId);

    if (!productId) {
      console.log("Invalid Product ID");
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: MESSAGES.BAD_REQUEST });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      console.log(`Product with ID ${productId} not found`);
      return res
        .status(STATUS_CODES.NOT_FOUND)
        .json({ success: false, message: MESSAGES.PRODUCT_NOT_FOUND });
    }
    console.log("Product found:", product);

    let categoryData;
    if (req.body.category) {
      categoryData = await categoryModel.findOne({ name: req.body.category });
      if (!categoryData) {
        console.log(`Category ${req.body.category} not found`);
        return res
          .status(STATUS_CODES.NOT_FOUND)
          .json({ success: false, message: MESSAGES.CATEGORY_NOT_FOUND });
      }
      console.log("Category validated:", categoryData);
    }

    let finalImages = [...product.images]; // Start with existing images

    // Update images where new files are provided
    for (let i = 1; i <= 3; i++) {
      const fieldName = `croppedImage${i}`;
      const file = req.files.find((f) => f.fieldname === fieldName);
      if (file) {
        console.log(`Updating image ${i} with new file: ${file.path}`);
        finalImages[i - 1] = file.path;
      }
    }

    console.log("Final Images:", finalImages);

    // Validate numeric fields (preserve existing values when fields not provided)
    let price = req.body.price ? parseFloat(req.body.price) : product.price;
    let stock = req.body.stock ? parseInt(req.body.stock) : product.stock;
    const offerPriceProvided =
      req.body.offerPrice !== undefined && req.body.offerPrice !== "";
    let offerPrice = offerPriceProvided
      ? parseFloat(req.body.offerPrice)
      : product.offerPrice;

    if (Number.isNaN(price) || Number.isNaN(stock)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Invalid price or stock value" });
    }

    // Reject negative or zero values where appropriate
    if (price <= 0) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Price must be a positive number" });
    }
    if (stock < 1 || !Number.isInteger(stock)) {
      return res
        .status(STATUS_CODES.BAD_REQUEST)
        .json({ success: false, message: "Stock must be a positive integer" });
    }

    if (offerPriceProvided) {
      if (Number.isNaN(offerPrice) || offerPrice <= 0) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({
            success: false,
            message: "Offer price must be a positive number",
          });
      }
      if (offerPrice > price) {
        return res
          .status(STATUS_CODES.BAD_REQUEST)
          .json({
            success: false,
            message: "Offer price cannot be greater than the original price",
          });
      }
    }

    // Handle form fields with fallbacks
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.category = categoryData ? categoryData._id : product.category;
    product.price = price;
    product.offerPrice = offerPrice;
    product.stock = stock;
    product.warranty =
      req.body.warranty && req.body.warranty !== "null"
        ? req.body.warranty
        : product.warranty;
    product.returnPolicy =
      req.body.returnPolicy && req.body.returnPolicy !== "null"
        ? req.body.returnPolicy
        : product.returnPolicy;
    product.images = finalImages;

    await product.save();

    return res
      .status(STATUS_CODES.OK)
      .json({ success: true, message: MESSAGES.PRODUCT_UPDATED });
  } catch (error) {
    console.error("Error in updateProduct controller:", error);
    return res
      .status(STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({
        success: false,
        message: MESSAGES.INTERNAL_SERVER_ERROR,
        error: error.message,
      });
  }
};

module.exports = {
  getProductAddPage,
  productsAdd,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProductPage,
  updateProduct,
};
