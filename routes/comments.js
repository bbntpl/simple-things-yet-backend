const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
  commentCreate,
	comments,
  commentFetch,
  commentUpdate,
  commentDelete,
} = require('../controllers/comment');
const Viewer = require('../models/viewer');

const router = express.Router();

// Get all of the comments
router.get('/', comments);

// Get specific comment by ID
router.get('/', commentFetch);

// Create a specific comment
router.post('/', authenticateUser(Viewer), commentCreate);

// Update a specific comment
router.put('/:id', authenticateUser(Viewer), commentUpdate);

// Delete an existing comment
router.delete('/:id', authenticateUser(Viewer), commentDelete);

module.exports = router;