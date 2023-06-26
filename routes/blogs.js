const express = require('express');
const {
	authenticateUser
} = require('../utils/middleware');
const {
	blogCreate,
	blogFetch,
	blogs,
	blogUpdate,
	blogDelete,
} = require('../controllers/blog');
const Author = require('../models/author');
const Viewer = require('../models/viewer');

const router = express.Router();

// Get all the blogs
router.get('/', blogs);

// Get specific blog by ID
router.get('/:id', blogFetch);

// Create a new blog
router.post('/', authenticateUser(Author), blogCreate);

// Save/publish a new blog or update an existing draft blog
router.post('/:publishAction', authenticateUser(Author), blogCreate); // for creating a new draft blog

// Update an existing blog by author
router.put('/:id/:publishAction/authors-only', authenticateUser(Author), blogUpdate);

// Indirect update of an existing blog based on user's interactions
router.put('/:id', authenticateUser(Viewer), blogUpdate);

// Delete a blog
router.delete('/:id', authenticateUser(Author), blogDelete);

module.exports = router;