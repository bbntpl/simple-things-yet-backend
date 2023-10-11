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
	categoriesWithTotalBlogs
} = require('../controllers/category');
const Author = require('../models/author');
const { resourceImageFetch } = require('../controllers/reusables');

const router = express.Router();

// Ge tall of the categories
router.get('/', categories);

// Get categories that has minimum of one published blogs
router.get('/with-total-blogs', categoriesWithTotalBlogs);

// Get categories that has minimum of one published blogs
router.get('/with-published-blogs', categoriesWithPublishedBlogs);

// Fetch a specific category by ID
router.get('/:id', categoryFetch);

// Fetch category image using image ID
router.get('/:id/image', resourceImageFetch);

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
