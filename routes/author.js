const express = require('express');

const { authenticateUser, upload, transformReqBodyValues } = require('../utils/middleware');

const {
	authorImageUpdate,
	authorUpdate,
	authorFetch,
	authorRegister,
	authorLogin,
	validateAuthor,
	validateEmail,
	authorInfoFetch
} = require('../controllers/author');
const Author = require('../models/author');

const router = express.Router();

router.get('/', authorFetch);

router.get('/info', authorInfoFetch);

router.post('/register', validateAuthor, authorRegister);

router.post('/login', authorLogin);

router.put('/update',
	authenticateUser(Author),
	validateEmail,
	authorUpdate
);

router.put('/update/image',
	authenticateUser(Author),
	upload.single('authorImage'),
	transformReqBodyValues,
	authorImageUpdate
);

module.exports = router;