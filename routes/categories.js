const express = require('express');

const { authenticateUser, upload, transformReqBodyValues } = require('../utils/middleware');
const {
	categoryCreate,
	categories,
	categoryFetch,
	categoryUpdate,
	categoryImageUpdate,
	categoryDelete,
	validateCategory,
	categoriesWithPublishedBlogs,
	categoriesWithLatestBlogs,
	categoryFetchBySlug,
	categoryWithPublishedBlogs
} = require('../controllers/category');
const Author = require('../models/author');
const { validateCreditInfo } = require('../controllers/image-file');

const router = express.Router();

// Get all of the categories
router.get('/', categories);

// Get categories that has embedded latest blogs
router.get('/with-latest-blogs', categoriesWithLatestBlogs);

// Get categories that has published blogs instead of every blogs
router.get('/with-published-blogs', categoriesWithPublishedBlogs);

// Fetch a specific category by ID
router.get('/:id', categoryFetch);

// Fetch a specific category by slug
router.get('/:slug/slug', categoryFetchBySlug);

// Fetch a specific category by slug with published blogs
router.get('/:slug/slug/with-published-blogs', categoryWithPublishedBlogs);

// Create a new category
router.post('/',
	authenticateUser(Author),
	upload.single('categoryImage'),
	transformReqBodyValues,
	validateCategory,
	validateCreditInfo,
	categoryCreate
);

// Update an existing category image
router.put('/:id/image',
	authenticateUser(Author),
	upload.single('categoryImage'),
	transformReqBodyValues,
	validateCreditInfo,
	categoryImageUpdate);

// Update an existing category
router.put('/:id', authenticateUser(Author), categoryUpdate);

// Deletle an existing category
router.delete('/:id', authenticateUser(Author), categoryDelete);

module.exports = router;
