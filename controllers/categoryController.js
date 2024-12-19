const Category = require('../models/categoryModel');
const Product = require('../models/productModel');

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;  // Default to page 1
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})  // Find all categories
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
          return res.status(400).json({
              type: 'error',
              message: 'Category already exists',
          });
      }

      if (!name.trim() || !description.trim()) {  // Check if name and description are not empty
        return res.status(400).json({ success: false, message: 'Name and description cannot be empty or contain only spaces' });
      }

      const newCategory = new Category({ name, description });
      await newCategory.save();

      res.status(200).json({
          type: 'success',
          message: 'Category added successfully',
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({
          type: 'error',
          message: 'An error occurred while adding the category',
      });
  }
};
  

  const toggleListStatus = async (req, res) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);  // Find category by ID
        if (!category) {
            return res.status(404).json({
                type: 'error',
                message: 'Category not found',
            });
        }

        category.isListed = !category.isListed;
        category.status = category.isListed ? 'Listed' : 'Unlisted';  // Update category status
        await category.save();

        res.status(200).json({
            type: 'success',
            message: `Category ${category.isListed ? 'listed' : 'unlisted'} successfully`,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            type: 'error',
            message: 'Failed to update category status',
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
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const applyCategoryOffer = async (req, res) => {
  try {
      const { categoryId, offerValue } = req.body;

      if (!categoryId || offerValue === undefined) {
          return res.status(400).json({ success: false, message: 'Category ID and Offer Value are required' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
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

      res.status(200).json({ success: true, message: 'Category offer applied successfully' });
  } catch (error) {
      console.error('Error applying category offer:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


const removeCategoryOffer = async (req, res) => {
  try {
      const { categoryId } = req.body;

      if (!categoryId) {
          return res.status(400).json({ success: false, message: 'Category ID is required' });
      }

      const category = await Category.findById(categoryId);
      if (!category) {
          return res.status(404).json({ success: false, message: 'Category not found' });
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

      res.status(200).json({ success: true, message: 'Category offer removed successfully' });
  } catch (error) {
      console.error('Error removing category offer:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
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
