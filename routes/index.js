const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
	res.json({
		message: 'Hello there! Welcome to BB\'s blog backend API.',
	});
});

module.exports = router;