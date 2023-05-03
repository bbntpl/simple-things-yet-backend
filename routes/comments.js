const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
	commentCreate,
	comments,
	replies,
	commentFetch,
	commentUpdate,
	commentDelete,
	validateCommentCreate,
	replyCreate,
	replyUpdate
} = require('../controllers/comment');
const Viewer = require('../models/viewer');
const Author = require('../models/author');

const router = express.Router();

// Get all of the comments
router.get('/', comments);

// Get specific comment by ID
router.get('/:parentCommentId', commentFetch);

// Get all of the replies under comment
router.get('/:parentCommentId/replies/', replies);

// Create a specific comment as a viewer
router.post('/', validateCommentCreate, authenticateUser(Viewer), commentCreate);

// Update a specific comment as a viewer
router.put('/:parentCommentId', authenticateUser(Viewer), commentUpdate);

// Delete an existing comment as a viewer
router.delete('/:parentCommentId', authenticateUser(Viewer), commentDelete);

// Create a reply as a viewer
router.post('/:parentCommentId/replies', validateCommentCreate, authenticateUser(Viewer), replyCreate);

// Update a reply as a viewer
router.put('/:parentCommentId/replies/:replyId', authenticateUser(Viewer), replyUpdate);

// Delete a reply as a viewer
router.delete('/:parentCommentId/replies/:replyId', authenticateUser(Viewer), commentDelete);

// Create a specific comment as an author
router.post('/author-only', validateCommentCreate, authenticateUser(Author), commentCreate);

// Update a specific comment as an author
router.put('/:parentCommentId/author-only', authenticateUser(Author), commentUpdate);

// Delete an existing comment as an author
router.delete('/:parentCommentId/author-only', authenticateUser(Author), commentDelete);

// Create a reply as an author
router.post('/:parentCommentId/replies/author-only', validateCommentCreate, authenticateUser(Author), replyCreate);

// Update a reply as an author
router.put('/:parentCommentId/replies/:replyId/author-only', authenticateUser(Author), replyUpdate);

// Delete a reply as an author
router.delete('/:parentCommentId/replies/:replyId/author-only', authenticateUser(Author), commentDelete);

module.exports = router;