const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const Author = require('../models/author');
const { SECRET_KEY } = require('../utils/config');

exports.validateAuthor = [
	body('email')
		.trim()
		.isEmail()
		.withMessage('Invalid email'),
	body('username')
		.isLength({ min: 4, max: 20 })
		.withMessage('Username must be between 4 and 20 characters')
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage('Username can only contain alphanumeric characters'),
	body('password')
		.isLength({ min: 8 })
		.withMessage('Password must be at least 8 characters'),
];

exports.authorUpdate = async (req, res, next) => {
	const { name, bio } = req.body;
	try {
		const author = req.user;

		const updatedAuthor = await Author.findByIdAndUpdate(
			author.id,
			{ name, bio },
			{ new: true }
		);

		if (!updatedAuthor) {
			return res.status(404).json({ error: 'Author not found' });
		}

		return res.json(updatedAuthor);
	} catch (err) {
		next(err);
	}
};

exports.authorFetch = async (req, res, next) => {
	try {
		const author = await Author.findOne({});

		if (!author) {
			return res.status(404).json({ error: 'Author not found' });
		}

		return res.json(author);
	} catch (err) {
		next(err);
	}
};

exports.authorRegister = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { email, username, password, bio } = req.body;

	try {
		const numOfAuthors = await Author.countDocuments({});

		if (numOfAuthors >= 1) {
			return res.status(403)
				.json('message: You are only allowed to have one account');
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const author = new Author({
			name: username,
			bio,
			email,
			username,
			passwordHash,
		});

		await author.save()
			.then(savedDoc => {
				res.status(201).json(savedDoc);
			})
			.catch(err => next(err));
	} catch (err) {
		next(err);
	}
};

exports.authorLogin = async (req, res, next) => {
	const { username, password } = req.body;

	try {
		const author = await Author.findOne({ username });

		const isPasswordCorrect = author
			? await bcrypt.compare(password, author.passwordHash)
			: false;

		if (!(author && isPasswordCorrect)) {
			return res.status(401).json({ error: 'invalid username or password' });
		}

		const authorForToken = {
			username: author.username,
			id: author._id,
		};

		const token = jwt.sign(
			authorForToken,
			SECRET_KEY,
			{ expiresIn: 60 * 60 }
		);

		return res.json({
			token,
			username: author.username,
			name: author.name
		});
	} catch (err) {
		next(err);
	}
};