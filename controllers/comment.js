const Comment = require('../models/comment');
const Blog = require('../models/blog');

exports.commentCreate = async (req, res, next) => {
	const { content, viewer, blog, parentComment } = req.body;

	try {
		const comment = new Comment({
			content,
			viewer,
			blog,
			parentComment,
		});

		const savedComment = await comment.save();

		// Update blog's comment list
		const relatedBlog = await Blog.findById(blog);
		relatedBlog.comments.push(savedComment);
		await relatedBlog.save();

		return res.status(201).json(savedComment);
	} catch (err) {
		next(err);
	}
};

exports.comments = async (req, res, next) => {
	try {
		const comments = await Comment.find({}).populate('viewer');
		return res.json(comments);
	} catch (err) {
		next(err);
	}
};

exports.commentFetch = async (req, res, next) => {
	const { id } = req.params;

	try {
		const comment = await Comment.findById(id).populate('viewer');

		if (!comment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		return res.json(comment);
	} catch (err) {
		next(err);
	}
};

exports.commentUpdate = async (req, res, next) => {
	const { content } = req.body;
	const { id } = req.params;

	try {
		const updatedComment = await Comment.findByIdAndUpdate(
			id,
			{ content },
			{ new: true }
		);

		if (!updatedComment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		return res.json(updatedComment);
	} catch (err) {
		next(err);
	}
};

exports.commentDelete = async (req, res, next) => {
	const { id } = req.params;

	try {
		const deletedComment = await Comment.findByIdAndRemove(id);

		if (!deletedComment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		// Update blog's comment list
		const relatedBlog = await Blog.findById(deletedComment.blog);
		relatedBlog.comments.pull(id);
		await relatedBlog.save();

		return res.status(204).json(deletedComment);
	} catch (err) {
		next(err);
	}
};
