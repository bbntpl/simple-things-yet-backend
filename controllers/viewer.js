const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { body, validationResult } = require('express-validator');
const { SECRET_KEY } = require('../utils/config');

const Viewer = require('../models/viewer');

exports.validateViewerRegistration = [
	body('name')
		.notEmpty()
		.withMessage('Name is required')
		.trim()
		.escape(),
	body('username')
		.notEmpty()
		.withMessage('Username is required')
		.isLength({ min: 4, max: 20 })
		.withMessage('Username should be between 4 to 20 characters')
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage('Username can only contain alphanumeric characters'),
	body('password')
		.notEmpty()
		.withMessage('Password is required')
		.isLength({ min: 8 })
		.withMessage('Password should be at least 8 characters')
];

// Add validation rules
exports.validateViewerLogin = [
	body('username')
		.notEmpty()
		.withMessage('Username is required')
		.trim()
		.escape(),
	body('password')
		.notEmpty()
		.withMessage('Password is required')
];

exports.viewerRegister = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { name, username, password } = req.body;
	try {
		const existingViewer = await Viewer.findOne({ username });
		if (existingViewer) {
			return res.status(400).json({ error: 'Username is already taken' });
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const viewer = new Viewer({ name, username, passwordHash });

		const savedViewer = await viewer.save();
		res.status(201).json(savedViewer);
	} catch (err) {
		next(err);
	}
};

exports.viewerLogin = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { username, password } = req.body;
	try {
		const viewer = await Viewer.findOne({ username });
		if (!viewer) {
			return res.status(400).json({ error: 'Invalid username' });
		}

		const passwordCorrect = await bcrypt.compare(password, viewer.passwordHash);
		if (!passwordCorrect) {
			return res.status(400).json({ error: 'Invalid password' });
		}

		const userForToken = {
			username: viewer.username,
			id: viewer._id,
		};

		// Token expires in 60 min
		const token = jwt.sign(
			userForToken,
			SECRET_KEY,
			{ expiresIn: '2d' }
		);

		res.send({
			token,
			username: viewer.username,
			name: viewer.name
		});
	} catch (err) {
		next(err);
	}
};

exports.viewerFetch = async (req, res, next) => {
	try {
		const viewer = await Viewer.findById(req.params.id);
		if (!viewer) {
			return res.status(404).json({ message: 'Viewer not found' });
		}
		res.json(viewer);
	} catch (err) {
		next(err);
	}
};

exports.viewers = async (req, res, next) => {
	try {
		const viewers = await Viewer.find({});
		res.json(viewers);
	} catch (err) {
		next(err);
	}
};

exports.viewerUpdate = async (req, res, next) => {
	const { name, username, passwordHash } = req.body;

	try {
		const existingViewer = await Viewer.findById(req.params.id);

		if (!existingViewer) {
			return res.status(404).json({ error: 'Viewer not found' });
		}

		const updatedViewer = {
			name,
			username,
			passwordHash
		};

		const viewer = await Viewer.findByIdAndUpdate(
			req.params.id,
			updatedViewer,
			{ new: true }
		);

		res.json(viewer);
	} catch (err) {
		next(err);
	}
};

exports.viewerPasswordConfirm = async (req, res, next) => {
	const { passwordInput } = req.body;

	try {
		const viewer = await Viewer.findById(req.params.id);
		if (!viewer) {
			return res.status(404).json({ message: 'Viewer not found' });
		}

		const passwordCorrect = await bcrypt.compare(passwordInput, viewer.passwordHash);
		res.status(200).json({ result: !!passwordCorrect });
	} catch (err) {
		next(err);
	}
};

exports.viewerPasswordChange = async (req, res, next) => {
	const { currentPassword, newPassword, confirmPassword } = req.body;

	try {
		if (newPassword !== confirmPassword) {
			return res.status(400).json({ error: 'Password confirmation does not match' });
		}

		const viewer = await Viewer.findById(req.params.id);
		if (!viewer) {
			return res.status(404).json({ message: 'Viewer not found' });
		}

		const passwordCorrect = await bcrypt.compare(currentPassword, viewer.passwordHash);
		if (!passwordCorrect) {
			return res.status(400).json({ error: 'Current password is incorrect' });
		}

		viewer.passwordHash = await bcrypt.hash(newPassword, 10);
		await viewer.save();
		res.status(200).json({ message: 'Password updated successfully' });
	} catch (err) {
		next(err);
	}
};

exports.viewerDelete = async (req, res, next) => {
	try {
		const viewer = await Viewer.findById(req.params.id);
		if (!viewer) {
			return res.status(404).json({ error: 'Viewer not found' });
		}

		const deletedViewer = await Viewer.deleteOne({ _id: req.params.id });

		res.status(204).json(deletedViewer);
	} catch (err) {
		next(err);
	}
};