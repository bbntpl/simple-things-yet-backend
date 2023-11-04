const express = require('express');
const {
	authenticateUser,
	upload,
	transformReqBodyValues
} = require('../utils/middleware');
const {
	imageFiles,
	imageFileFetch,
	imageFileCreate,
	imageFileDelete,
	validateCreditInfo,
	imageFileUpdate
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
	transformReqBodyValues,
	validateCreditInfo,
	imageFileCreate
);

router.put('/:id/update',
	authenticateUser(Author),
	transformReqBodyValues,
	validateCreditInfo,
	imageFileUpdate
);

router.delete('/:id/doc',
	authenticateUser(Author),
	imageFileDelete
);

module.exports = router;