const express = require('express');
const { authenticateViewer } = require('../utils/middleware');
const {
  commentCreate,
	comments,
  commentFetch,
  commentUpdate,
  commentDelete,
} = require('../controllers/comment');

const router = express.Router();

// Get all of the comments
router.get('/', comments);

// Get specific comment by ID
router.get('/', commentFetch);

// Create a specific comment
router.post('/', authenticateViewer, commentCreate);

// Update a specific comment
router.put('/:id', authenticateViewer, commentUpdate);

// Delete an existing comment
router.delete('/:id', authenticateViewer, commentDelete);

module.exports = router;