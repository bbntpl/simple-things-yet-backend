const Comment = require('../models/comment');
const Blog = require('../models/blog');

const { body, validationResult } = require('express-validator');
const Author = require('../models/author');
const Viewer = require('../models/viewer');

exports.validateCommentCreate = [
	body('content')
		.notEmpty()
		.withMessage('Content is required')
		.isLength({ min: 1, max: 800 })
		.withMessage('Content must be between 1 and 800 characters'),
	body('user')
		.notEmpty()
		.withMessage('User is required')
		.isMongoId()
		.withMessage('Invalid user ID'),
	body('blog')
		.notEmpty()
		.withMessage('Blog is required')
		.isMongoId()
		.withMessage('Invalid blog ID'),
	body('parentComment')
		.optional()
		.isMongoId()
		.withMessage('Invalid parent comment ID'),
];

exports.replies = async (req, res, next) => {
	const { parentCommentId } = req.params;
	try {
		const comments = await Comment.findById(parentCommentId).populate(['viewer', 'author']);
		return res.json(comments.replies);
	} catch (err) {
		next(err);
	}
};

exports.comments = async (req, res, next) => {
	try {
		const comments = await Comment.find({}).populate(['viewer', 'author']);
		return res.json(comments);
	} catch (err) {
		next(err);
	}
};

exports.commentFetch = async (req, res, next) => {
	const { parentCommentId } = req.params;

	try {
		const comment = await Comment.findById(parentCommentId).populate(['viewer', 'author']);

		if (!comment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		return res.json(comment);
	} catch (err) {
		next(err);
	}
};

const blogCommentListUpdate = async (blog, savedComment) => {
	const relatedBlog = await Blog.findById(blog);
	relatedBlog.comments.push(savedComment);
	await relatedBlog.save();
};

const userCommentListUpdate = async (userType, user, savedComment) => {
	const UserModel = userType === 'author' ? Author : Viewer;
	const commentWriter = await UserModel.findById(user);
	commentWriter.comments.push(savedComment);
	await commentWriter.save();
};

// Helper function to create comments and replies
const createCommentOrReply = async (req, isReply) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw { status: 400, errors: errors.array() };
	}

	const { content, user, blog, parentComment } = req.body;
	const userType = req.url.includes('/author-only') ? 'author' : 'viewer';
	const comment = new Comment({
		content,
		[userType]: user,
		blog,
		parentComment: isReply ? parentComment : null,
	});

	const savedComment = await comment.save();

	blogCommentListUpdate(blog, savedComment);
	userCommentListUpdate(userType, user, savedComment);

	if (isReply) {
		await Comment.findByIdAndUpdate(parentComment, {
			$push: {
				replies: savedComment._id,
			},
		});
	}

	return savedComment;
};

exports.commentCreate = async (req, res, next) => {
	try {
		const savedComment = await createCommentOrReply(req, false);
		return res.status(201).json(savedComment);
	} catch (err) {
		next(err);
	}
};

exports.replyCreate = async (req, res, next) => {
	try {
		const savedReply = await createCommentOrReply(req, true);
		return res.status(201).json(savedReply);
	} catch (err) {
		next(err);
	}
};

const updateCommentOrReply = async (isReply, req, res, next) => {
	const { content } = req.body;
	const { parentCommentId, replyId } = req.params;

	try {
		const commentId = isReply ? replyId : parentCommentId;

		const updatedComment = await Comment.findByIdAndUpdate(
			commentId,
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

exports.commentUpdate = async (req, res, next) => {
	await updateCommentOrReply(false, req, res, next);
};

exports.replyUpdate = async (req, res, next) => {
	await updateCommentOrReply(true, req, res, next);
};

const blogCommentListDelete = async (blogId, savedCommentId) => {
	// Update blog's comment list
	const blogThatReferencesComment = await Blog.findById(blogId);
	blogThatReferencesComment.comments.pull(savedCommentId);
	await blogThatReferencesComment.save();
}

const userCommentListDelete = async (userType, userId, savedCommentId) => {
	const UserModel = userType === 'author' ? Author : Viewer;
	const commentWriter = await UserModel.findById(userId);
	commentWriter.comments.push(savedCommentId);
	await commentWriter.save();
};


const deleteCommentOrReply = async (isReply, req, res, next) => {
	const { parentCommentId, replyId } = req.params;

	try {
		const commentId = isReply ? replyId : parentCommentId;
		const userType = req.url.includes('/author-only') ? 'author' : 'viewer';

		const comment = await Comment.findById(commentId);

		if (!comment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		blogCommentListDelete(comment.blog, commentId);
		userCommentListDelete(userType, comment[userType], commentId);

		if(isReply) {
			
		}

		return res.status(204);
	} catch (err) {
		next(err);
	}
};

exports.commentDelete = async (req, res, next) => {
	deleteCommentOrReply(false, req, res, next);
};

exports.replyDelete = async (req, res, next) => {
	deleteCommentOrReply(true, req, res, next);
};