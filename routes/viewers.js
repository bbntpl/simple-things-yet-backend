const express = require('express');
const {
	viewerRegister,
	viewerLogin,
	viewers,
	viewerFetch,
	viewerDelete,
	viewerUpdate,
	viewerPasswordConfirm,
	viewerPasswordChange,
	validateViewerLogin,
	validateViewerRegistration
} = require('../controllers/viewer');
const Viewer = require('../models/viewer');
const { authenticateUser } = require('../utils/middleware');

const router = express.Router();

router.get('/all', viewers);

router.get('/:id', viewerFetch);

// Register as a new user/viewer
router.post('/register', validateViewerRegistration, viewerRegister);

// Login as an existing user/viewer
router.post('/login', validateViewerLogin, viewerLogin);

// Password ocnfirmation which return a boolean
router.post('/:id/confirm-password', authenticateUser(Viewer), viewerPasswordConfirm);

// Delete the account of user/viwer
router.delete('/:id/delete', authenticateUser(Viewer), viewerDelete);

// Update allowed information of user/viewer
router.put('/:id/update', authenticateUser(Viewer), viewerUpdate);

router.put('/:id/change-password', authenticateUser(Viewer), viewerPasswordChange);

module.exports = router;