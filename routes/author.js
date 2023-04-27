const express = require('express');

const { authenticateAuthor } = require('../utils/middleware');

const {
	authorUpdate,
	authorFetch,
	authorRegister,
	authorLogin
} = require('../controllers/author');

const router = express.Router();

router.get('/', authorFetch);

router.post('/update', authenticateAuthor, authorUpdate);

router.post('/register', authorRegister);

router.post('/login', authorLogin);

module.exports = router;

