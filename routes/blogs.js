const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
  blogCreate,
	blogFetch,
  blogs,
  blogUpdate,
  blogDelete,
} = require('../controllers/blog');
const Author = require('../models/author');

const router = express.Router();

// Get all the blogs
router.get('/', blogs);

// Get specific blog by ID
router.get('/:id', blogFetch);

// Create a new blog
router.post('/', authenticateUser(Author), blogCreate);

// Update an existing blog
router.put('/:id', authenticateUser(Author), blogUpdate);

// Delete a blog
router.delete('/:id', authenticateUser(Author), blogDelete);

module.exports = router;