const Blog = require('../models/blog');
const Category = require('../models/category');
const Comment = require('../models/comment');

exports.blogCreate = async (req, res, next) => {
	const { title, content } = req.body;
	try {
		const blog = new Blog({
			title,
			content,
			author: req.user._id
		})

		const savedBlog = await blog.save();

		return res.status(201).json(savedBlog);
	} catch (err) {
		next(err);
	}
};

exports.blogs = async (req, res, next) => {
	try {
		const blogs = await Blog.find({});
		return res.json(blogs);
	} catch (err) {
		next(err);
	}
};

exports.blogFetch = async (req, res, next) => {
	const { id } = req.params;

	try {
		const blog = await Blog.findById(id).populate('author');

		if (!blog) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		return res.json(blog);
	} catch (err) {
		next(err);
	}
};

const blogCategoryUpdate = async (blogToUpdate, updatedData) => {
	const oldCategories = blogToUpdate.categories;
	const newCategories = updatedData.categories;
	const hasCategoryUpdates = JSON.stringify(oldCategories.sort()) !== JSON.stringify(newCategories.sort());

	if (hasCategoryUpdates) {
		// Remove blog reference from old categories
		for (const categoryId of oldCategories) {
			const category = await Category.findById(categoryId);
			category.blogs = category.blogs.filter(blogId => blogId.toString() !== blogToUpdate._id.toString());
			await category.save();
		}

		// Add blog reference to new categories
		for (const categoryId of newCategories) {
			const category = await Category.findById(categoryId);
			category.blogs.push(blogToUpdate._id);
			await category.save();
		}
	}
}

exports.blogUpdate = async (req, res, next) => {
	const { id } = req.params;
	try {
		const blogToUpdate = await Blog.findById(id);

		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		const updatedData = {...req.body };

		await blogCategoryUpdate(blogToUpdate, updatedData);
		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			updatedData,
			{ new: true }
		);

		return res.json(updatedBlog);
	} catch (err) {
		next(err);
	}
};

exports.blogDelete = async (req, res, next) => {
	const { id } = req.params;

	try {
		const blog = await Blog.findById(id);

		if (blog.comments.length > 0) {
			await Promise.all(blog.comments.map(async (id) => {
				await Comment.findByIdAndRemove(id);
			}))
		}

		const deletedBlog = await blog.deleteOne({ _id: blog._id });

		return res.status(204).json(deletedBlog);

	} catch (err) {
		next(err);
	}
};