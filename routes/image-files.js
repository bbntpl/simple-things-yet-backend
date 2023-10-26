const express = require('express');
const { authenticateUser, upload } = require('../utils/middleware');
const {
	imageFiles,
	imageFileFetch,
	imageFileCreate,
	imageFileDelete
} = require('../controllers/image-file');
const Author = require('../models/author');
const { resourceImageFetch } = require('../controllers/reusables');

const router = express.Router();

router.get('/docs', imageFiles);

router.get('/:id/doc', imageFileFetch);

router.get('/:id/source', resourceImageFetch);

router.post('/upload',
	authenticateUser(Author),
	upload.single('uploadImage'),
	imageFileCreate
);

router.delete('/:id/doc',
	authenticateUser(Author),
	imageFileDelete
);

module.exports = router;