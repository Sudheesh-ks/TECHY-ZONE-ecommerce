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
    const { name, description, offerPrice, categoryOffer } = req.body;

    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).send("<script>alert('Category already exists'); window.location.href='/admin/category';</script>");
        }

        const newCategory = new Category({ name, description, offerPrice, categoryOffer });
        await newCategory.save();

        res.redirect('/admin/category');
    } catch (error) {
        console.error(error);
        res.status(500).send("<script>alert('An error occurred while adding the category.'); window.location.href='/admin/category';</script>");
    }
};

const toggleListStatus = async (req, res) => {
    const { id } = req.params;
    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ error: "Category not found" });
        }

        // Toggle the `isListed` status and update the `status` field accordingly
        category.isListed = !category.isListed;
        category.status = category.isListed ? "Listed" : "Unlisted"; // Update the status field
        await category.save();

        res.status(200).json({ message: "Category status updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const editCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description, offerPrice, categoryOffer } = req.body;

    try {
        await Category.findByIdAndUpdate(id, {
            name,
            description,
            offerPrice,
            categoryOffer
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
