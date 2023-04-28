const Blog = require('../models/blog');

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

exports.blogUpdate = async (req, res) => {
	const { id } = req.params;

	try {
		const blog = {
			...req.body,
		}

		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			blog,
			{ new: true }
		);

		if (!updatedBlog) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		return res.json(updatedBlog);

	} catch (err) {
		next(err);
	}
};

exports.blogDelete = async (req, res) => {
	const { id } = req.params;

	try {
		const deletedBlog = await Blog.findByIdAndRemove(id);
		return res.status(204).json(deletedBlog);

	} catch (err) {
		next(err);
	}
};