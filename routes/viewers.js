const express = require('express');
const {
  viewerRegister,
  viewerLogin,
	viewers,
	viewerFetch,
	viewerDelete,
	viewerUpdate,
} = require('../controllers/viewer');

const router = express.Router();

router.get('/', viewers);

router.get('/:id', viewerFetch);

router.put('/:id/update', viewerUpdate);

// Register as a new user/viewer
router.post('/:id/register', viewerRegister);

// Login as an existing user/viewer
router.post('/:id/login', viewerLogin);

// Delete the account of user/viwer
router.delete('/:id/delete', viewerDelete)

module.exports = router;