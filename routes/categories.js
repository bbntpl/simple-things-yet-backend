const express = require('express');

const { authenticateUser, upload } = require('../utils/middleware');
const {
	categoryCreate,
	categories,
	categoryFetch,
	categoryUpdate,
	categoryImageUpdate,
	categoryDelete,
	validateCategory,
	categoriesWithPublishedBlogs,
	categoriesWithLatestBlogs
} = require('../controllers/category');
const Author = require('../models/author');

const router = express.Router();

// Get all of the categories
router.get('/', categories);

// Get categories that has embedded latest blogs
router.get('/with-latest-blogs', categoriesWithLatestBlogs);

// Get categories that has published blogs instead of every blogs
router.get('/with-published-blogs', categoriesWithPublishedBlogs);

// Fetch a specific category by ID
router.get('/:id', categoryFetch);

// Create a new category
router.post('/',
	authenticateUser(Author),
	upload.single('categoryImage'),
	validateCategory,
	categoryCreate
);

// Update an existing category image
router.put('/:id/image',
	authenticateUser(Author),
	upload.single('categoryImage'),
	categoryImageUpdate);

// Update an existing category
router.put('/:id', authenticateUser(Author), categoryUpdate);

// Deletle an existing category
router.delete('/:id', authenticateUser(Author), categoryDelete);

module.exports = router;
