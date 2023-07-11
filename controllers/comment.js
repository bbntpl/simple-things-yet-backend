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
		res.json(comments.replies);
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

exports.comments = async (req, res, next) => {
	try {
		const comments = await Comment.find({}).populate(['viewer', 'author']);
		res.json(comments);
	} catch (err) {
		console.log('Error:', err);
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

		res.json(comment);
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

const blogCommentListUpdate = async (blogId, savedCommentId) => {
	await Blog.findByIdAndUpdate(blogId, {
		$push: {
			comments: savedCommentId,
		},
	});
};

const userCommentListUpdate = async (userType, userId, savedCommentId) => {
	const UserModel = userType === 'author' ? Author : Viewer;
	await UserModel.findByIdAndUpdate(userId, {
		$push: {
			comments: savedCommentId,
		},
	});
};

// Helper function to create comments and replies
const createCommentOrReply = async (res, req, isReply) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ message: errors.array()[0].msg });
	}

	const { content, blog, parentComment } = req.body;
	const userType = req.url.includes('/author-only') ? 'author' : 'viewer';
	const comment = new Comment({
		content,
		[userType]: req.user._id,
		blog,
		parentComment: isReply ? parentComment : null,
	});

	const savedComment = await comment.save();

	await blogCommentListUpdate(blog, savedComment._id);
	await userCommentListUpdate(userType, req.user._id, savedComment._id);

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
		const savedComment = await createCommentOrReply(res, req, false);
		res.status(201).json(savedComment);
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

exports.replyCreate = async (req, res, next) => {
	try {
		const savedReply = await createCommentOrReply(res, req, true);
		res.status(201).json(savedReply);
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

const updateCommentOrReply = async (isReply, req, res, next) => {
	const { parentCommentId, replyId } = req.params;

	try {
		const commentId = isReply ? replyId : parentCommentId;

		const updatedBlog = {
			...req.body,
		};

		const updatedComment = await Comment.findByIdAndUpdate(
			commentId,
			{ ...updatedBlog },
			{ new: true }
		);

		if (!updatedComment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		res.json(updatedComment);
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

exports.commentUpdate = async (req, res, next) => {
	await updateCommentOrReply(false, req, res, next);
};

exports.replyUpdate = async (req, res, next) => {
	await updateCommentOrReply(true, req, res, next);
};

const userCommentListDelete = async (userType, userId, savedCommentId) => {
	const UserModel = userType === 'author' ? Author : Viewer;
	const commentWriter = await UserModel.findById(userId);
	commentWriter.comments.push(savedCommentId);
	await commentWriter.save();
};


const deleteCommentOrReply = async (isReply, req, res, next) => {
	const { parentCommentId, replyId } = req.params;

	function isUserOwner(reqUserId, commentUser) {
		return reqUserId.toString() === commentUser.toString();
	}

	try {
		const commentId = isReply ? replyId : parentCommentId;
		const userType = req.url.includes('/author-only') ? 'author' : 'viewer';

		const comment = await Comment.findById(commentId);

		if (!comment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		if (!isUserOwner(req.user._id, comment[userType])) {
			return res.status(403).json({
				error: `A ${isReply ? 'reply' : 'comment'} can only be deleted by the owner`
			});
		}

		userCommentListDelete(userType, comment[userType], commentId);

		await comment.deleteOne({ _id: comment._id })
			.then(() => {
				res.status(204).send();
			})
			.catch(err => next(err));
	} catch (err) {
		console.log('Error:', err);
		next(err);
	}
};

exports.commentDelete = async (req, res, next) => {
	deleteCommentOrReply(false, req, res, next);
};

exports.replyDelete = async (req, res, next) => {
	deleteCommentOrReply(true, req, res, next);
};