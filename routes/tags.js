const express = require('express');
const { authenticateUser } = require('../utils/middleware');
const {
	tagCreate,
	tags,
	tagFetch,
	tagUpdate,
	tagDelete,
	validateTag,
} = require('../controllers/tag');
const Author = require('../models/author');

const router = express.Router();

// Ge tall of the tags
router.get('/', tags);

// Fetch a specific tag by ID
router.get('/:id', tagFetch);

// Create a new tag
router.post('/', authenticateUser(Author), validateTag, tagCreate);

// Update an existing tag
router.put('/:id', authenticateUser(Author), tagUpdate);

// Deletle an existing tag
router.delete('/:id', authenticateUser(Author), tagDelete);

module.exports = router;
