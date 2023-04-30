const express = require('express');
const {
  viewerRegister,
  viewerLogin,
	viewers,
	viewerFetch,
	viewerDelete,
	viewerUpdate,
} = require('../controllers/viewer');
const Viewer = require('../models/viewer');
const { authenticateUser } = require('../utils/middleware');

const router = express.Router();

router.get('/all', viewers);

router.get('/:id', viewerFetch);

router.put('/:id/update', authenticateUser(Viewer), viewerUpdate);

// Register as a new user/viewer
router.post('/register', viewerRegister);

// Login as an existing user/viewer
router.post('/login', authenticateUser(Viewer), viewerLogin);

// Delete the account of user/viwer
router.delete('/:id/delete',authenticateUser(Viewer), viewerDelete)

module.exports = router;