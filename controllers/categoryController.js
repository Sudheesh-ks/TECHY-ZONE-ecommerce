const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const STATUS_CODES = require('../constants/status.constants');
const MESSAGES = require('../constants/responseMessage');

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  // Defaults to page 1
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})  // Finds all categories
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render("admin/category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
        });
    } catch (error) {
        console.log(error);
    }
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
      const existingCategory = await Category.findOne({  // Check if category already exists
          name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
      });

      if (existingCategory) {
          return res.status(STATUS_CODES.CONFLICT).json({
              type: 'error',
              message: MESSAGES.CONFLICT,
          });
      }

      if (!name.trim() || !description.trim()) {  // Check if name and description are not empty
        return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      const newCategory = new Category({ name, description });
      await newCategory.save();

      res.status(STATUS_CODES.CREATED).json({
          type: 'success',
          message: MESSAGES.CREATED,
      });
  } catch (error) {
      console.error(error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
          type: 'error',
          message: MESSAGES.INTERNAL_SERVER_ERROR,
      });
  }
};
  

  const toggleListStatus = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);  // Find category by ID
        if (!category) {
            return res.status(STATUS_CODES.NOT_FOUND).json({
                type: 'error',
                message: MESSAGES.NOT_FOUND,
            });
        }

        category.isListed = !category.isListed;
        category.status = category.isListed ? 'Listed' : 'Unlisted';  // Update category status
        await category.save();

        res.status(STATUS_CODES.OK).json({
            type: 'success',
            message: MESSAGES.SUCCESS,
        });
    } catch (error) {
        console.error(error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            type: 'error',
            message: MESSAGES.INTERNAL_SERVER_ERROR,
        });
    }
};

  


const editCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description} = req.body;

    try {
        await Category.findByIdAndUpdate(id, {  // Update category by ID
            name,
            description,
        });
        res.redirect('/admin/category');
    } catch (error) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: MESSAGES.INTERNAL_SERVER_ERROR });
    }
};

const applyCategoryOffer = async (req, res) => {
  try {
      const { categoryId, offerValue } = req.body;

      if (!categoryId || offerValue === undefined) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
          return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.NOT_FOUND });
      }

      category.categoryOffer = offerValue; // Apply the category offer
      await category.save();

      // Updates all products in the category
      const products = await Product.find({ category: categoryId });
      for (const product of products) {
          // Calculate the new offer price
          const basePrice = product.offerPrice || product.price; // Use offerPrice if exists, else original price
          const discountedPrice = Math.max(0, basePrice - offerValue); // Ensures price doesn't go below 0

          product.offerPrice = discountedPrice;
          product.categoryOffer = offerValue; // Track the category offer applied
          await product.save();
      }

      res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.SUCCESS });
  } catch (error) {
      console.error('Error applying category offer:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};


const removeCategoryOffer = async (req, res) => {
  try {
      const { categoryId } = req.body;

      if (!categoryId) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: MESSAGES.BAD_REQUEST });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
          return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.NOT_FOUND });
      }

      category.categoryOffer = null; // Remove the category offer
      await category.save();

      // Update products in the category
      const products = await Product.find({ category: categoryId });
      for (const product of products) {
          if (product.categoryOffer !== null) {
              const restoredPrice = product.offerPrice + product.categoryOffer; // Restore previous price
              product.offerPrice = restoredPrice <= product.price ? restoredPrice : product.price; // Ensure it doesn't exceed original price
              product.categoryOffer = null; // Remove category offer tracking
              await product.save();
          }
      }

      res.status(STATUS_CODES.OK).json({ success: true, message: MESSAGES.SUCCESS });
  } catch (error) {
      console.error('Error removing category offer:', error);
      res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MESSAGES.INTERNAL_SERVER_ERROR });
  }
};





module.exports = {
    categoryInfo,
    addCategory,
    editCategory,
    toggleListStatus,
    applyCategoryOffer,
    removeCategoryOffer
};
