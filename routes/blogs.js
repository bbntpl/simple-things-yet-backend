const express = require('express');

const {
	authenticateUser,
	upload
} = require('../utils/middleware');
const {
	blogCreate,
	blogFetch,
	blogs,
	publishedBlogListFetch,
	blogImageUpdate,
	blogUpdate,
	blogDelete,
	totalPublishedBlogs,
	totalUncategorizedPublishedBlogs,
	publishedBlogFetch,
	blogLikeUpdate,
} = require('../controllers/blog');
const Author = require('../models/author');
const Viewer = require('../models/viewer');

const router = express.Router();

// Get all the blogs
router.get('/', blogs);

// Get all published blogs
router.get('/published', publishedBlogListFetch);

// Get the total published blogs
router.get('/published/total-blogs', totalPublishedBlogs);

// Get all published blogs that does not have category
router.get('/published/unset-category', totalUncategorizedPublishedBlogs);

// Get specific published blog by id or slug 
router.get('/published/doc', publishedBlogFetch);

// Get specific blog by ID
router.get('/:id', blogFetch);

// Save/publish a new blog
router.post('/:publishAction',
	authenticateUser(Author),
	upload.single('blogImage'),
	blogCreate
); // for creating a new draft blog

// Update an existing blog image by author
router.put('/:id/image-update',
	authenticateUser(Author),
	upload.single('blogImage'),
	blogImageUpdate
);

// Update an existing blog by author
router.put('/:id/:publishAction',
	authenticateUser(Author),
	blogUpdate
);

// Indirect update of an existing blog based on user's interactions
router.put('/:blogId/likes/:userId', authenticateUser(Viewer), blogLikeUpdate);

// Delete a blog
router.delete('/:id', authenticateUser(Author), blogDelete);

module.exports = router;