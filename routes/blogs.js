const express = require('express');
const { authenticateAuthor } = require('../utils/middleware');
const {
  blogCreate,
	blogFetch,
  blogs,
  blogUpdate,
  blogDelete,
} = require('../controllers/blog');

const router = express.Router();

// Get all the blogs
router.get('/', blogs);

// Get specific blog by ID
router.get('/:id', blogFetch);

// Create a new blog
router.post('/', authenticateAuthor, blogCreate);

// Update an existing blog
router.put('/:id', authenticateAuthor, blogUpdate);

// Delete a blog
router.delete('/:id', authenticateAuthor, blogDelete);

module.exports = router;