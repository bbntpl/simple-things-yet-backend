const { body, validationResult } = require('express-validator');

const Category = require('../models/category');

const validateCategory = [
	body('name')
		.trim()
		.notEmpty()
		.withMessage('Name is a required input')
		.isString()
		.withMessage('The type of name must be string')
];

exports.validateCategory = [
	...validateCategory
];

exports.categoryCreate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { name, description } = req.body;
	try {
		const isCategoryExists = await Category.findOne({ name });

		if (isCategoryExists && String(isCategoryExists._id) !== String(req.params.id)) {
			return res.status(400).json({ error: `Category ${req.body.name} exists already` });
		}

		const category = { name, description };

		if (req.file) {
			category.imageId = req.file.id;
		}

		const newCategory = new Category(category);
		await newCategory.save();

		res.status(201).json(newCategory);
	} catch (err) {
		next(err);
	}
};

exports.categories = async (req, res, next) => {
	try {
		const categories = await Category.find({});
		res.json(categories);
	} catch (err) {
		next(err);
	}
};

exports.categoryFetch = async (req, res, next) => {
	const { id } = req.params;
	try {
		const category = await Category.findById(id);
		res.json(category);
	} catch (err) {
		next(err);
	}
};

exports.categoryImageUpdate = async (req, res, next) => {
	const { id } = req.params;
	try {
		const categoryToUpdate = await Category.findById(id);
		if (!categoryToUpdate) {
			return res.status(404).json({ error: 'Category not found' });
		}

		if (req.file && req.file.id) {
			categoryToUpdate.imageId = req.file.id;
			await categoryToUpdate.save();
			res.status(200).json(categoryToUpdate);
		} else {
			return res.status(400).json({ message: 'Uploaded category image not found' });
		}
	} catch (err) {
		next(err);
	}
};

exports.categoryUpdate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { id } = req.params;

	try {
		const updatedCategory = {
			name: req.body.name,
			description: req.body.description,
			blogs: req.body.blogs
		};

		const categoryToUpdate = await Category.findByIdAndUpdate(
			id,
			{ ...updatedCategory },
			{ new: true }
		);

		if (!categoryToUpdate) {
			return res.status(400).json({ error: `category "${req.body.name}" doesn/'t exist` });
		}

		res.json(categoryToUpdate);
	} catch (err) {
		next(err);
	}
};

exports.categoryDelete = async (req, res, next) => {
	const { id } = req.params;
	try {
		const category = await Category.findById(id);
		if (category.blogs.length > 0) {
			return res.status(400).json({
				message: 'You must remove all the associated blogs before deleting this category'
			});
		}

		await category.deleteOne({ _id: category._id });
		res.status(204).json(category);
	} catch (err) {
		next(err);
	}
};