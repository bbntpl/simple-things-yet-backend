const express = require('express');
const { authenticateAuthor } = require('../utils/middleware');
const {
  categoryCreate,
	categories,
  categoryFetch,
  categoryUpdate,
  categoryDelete,
} = require('../controllers/category');

const router = express.Router();

// Ge tall of the categories
router.get('/', categories);

// Fetch a specific category by ID
router.get('/:id', categoryFetch);

// Create a new category
router.post('/create', authenticateAuthor, categoryCreate);

// Update an existing category
router.put('/:id', authenticateAuthor, categoryUpdate);

// Deletle an existing category
router.delete('/:id', authenticateAuthor, categoryDelete);

module.exports = router;
