const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
  categoryCreate,
	categories,
  categoryFetch,
  categoryUpdate,
  categoryDelete,
} = require('../controllers/category');
const Author = require('../models/author');

const router = express.Router();

// Ge tall of the categories
router.get('/', categories);

// Fetch a specific category by ID
router.get('/:id', categoryFetch);

// Create a new category
router.post('/', authenticateUser(Author), categoryCreate);

// Update an existing category
router.put('/:id', authenticateUser(Author), categoryUpdate);

// Deletle an existing category
router.delete('/:id', authenticateUser(Author), categoryDelete);

module.exports = router;
