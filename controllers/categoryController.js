const Category = require('../models/categoryModel');

const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
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
        res.redirect("/pageerror");
    }
};

const addCategory = async (req, res) => {
    const { name, description } = req.body;
  
    try {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        req.flash('message', 'Category already exists');
        req.flash('type', 'error');
        return res.redirect('/admin/category');
      }
  
      const newCategory = new Category({ name, description });
      await newCategory.save();
  
      req.flash('message', 'Category added successfully');
      req.flash('type', 'success');
      res.redirect('/admin/category');
    } catch (error) {
      console.error(error);
      req.flash('message', 'An error occurred while adding the category');
      req.flash('type', 'error');
      res.redirect('/admin/category');
    }
  };
  

  const toggleListStatus = async (req, res) => {
    const { id } = req.params;
    try {
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found', type: 'error' });
      }
  
      category.isListed = !category.isListed;
      category.status = category.isListed ? 'Listed' : 'Unlisted';
      await category.save();
  
      res.status(200).json({ message: 'Category status updated successfully', type: 'success' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error', type: 'error' });
    }
  };
  


const editCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description} = req.body;

    try {
        await Category.findByIdAndUpdate(id, {
            name,
            description,
        });
        res.redirect('/admin/category');
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = {
    categoryInfo,
    addCategory,
    editCategory,
    toggleListStatus,
};
