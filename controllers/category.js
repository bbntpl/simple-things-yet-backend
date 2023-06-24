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

		if (isCategoryExists) {
			return res.status(400).json({ error: `Category ${name} exists already` });
		}

		const newCategory = new Category({ name, description });
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
			updatedCategory,
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