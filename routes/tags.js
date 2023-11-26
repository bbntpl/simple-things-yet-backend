const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
	tagCreate,
	tags,
	tagsWithPublishedBlogs,
	tagFetchById,
	tagFetchBySlug,
	tagUpdate,
	tagDelete,
	validateTag,
	tagWithPublishedBlogs,
} = require('../controllers/tag');
const Author = require('../models/author');

const router = express.Router();

// Ge tall of the tags
router.get('/', tags);

// Get tags that has embedded latest blogs
router.get('/with-published-blogs', tagsWithPublishedBlogs);

// Get tags that has embedded latest blogs
router.get('/:id/with-published-blogs', tagWithPublishedBlogs);

// Fetch a specific tag by ID
router.get('/:id', tagFetchById);

// Fetch a specific tag by slug
router.get('/:slug/slug', tagFetchBySlug);

// Fetch a specific tag by slug with published blogs
router.get('/:slug/slug/with-published-blogs', tagWithPublishedBlogs);

// Create a new tag
router.post('/', authenticateUser(Author), validateTag, tagCreate);

// Update an existing tag
router.put('/:id', authenticateUser(Author), tagUpdate);

// Deletle an existing tag
router.delete('/:id', authenticateUser(Author), tagDelete);

module.exports = router;
