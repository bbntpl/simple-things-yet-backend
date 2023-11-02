const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const Author = require('../models/author');
const { SECRET_KEY } = require('../utils/config');

const { getImageFileIdForUpdate } = require('./reusables');

exports.validateEmail = [
	body('email')
		.trim()
		.isEmail()
		.withMessage('Invalid email')
];

exports.validateAuthor = [
	...this.validateEmail,
	body('username')
		.isLength({ min: 4, max: 20 })
		.withMessage('Username must be between 4 and 20 characters')
		.matches(/^[a-zA-Z0-9]+$/)
		.withMessage('Username can only contain alphanumeric characters'),
	body('password')
		.isLength({ min: 8 })
		.withMessage('Password must be at least 8 characters'),
];

exports.authorImageUpdate = async (req, res, next) => {
	try {
		const author = req.user;
		if (!author) {
			return res.status(404).json({ message: 'Author not found' });
		}

		if (req.file && req.file.id) {
			const imageFileIdForUpdate = await getImageFileIdForUpdate(req, author);
			const updatedAuthor = await Author.findByIdAndUpdate(
				author.id,
				{ imageFile: imageFileIdForUpdate },
				{ new: true }
			);

			if (!updatedAuthor) {
				return res.status(404).json({ message: 'Author not found after update' });
			}

			res.status(200).json(updatedAuthor);
		} else {
			res.status(400).json({ message: 'Uploaded author picture not found' });
		}
	} catch (err) {
		next(err);
	}
};

exports.authorUpdate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			message: errors.array()[0].msg
		});
	}

	const updateData = {
		name: req.body.name,
		email: req.body.email,
		bio: req.body.bio
	};

	try {
		const author = req.user;
		const updatedAuthor = await Author.findByIdAndUpdate(
			author.id,
			updateData,
			{ new: true }
		);

		if (!updatedAuthor) {
			return res.status(404).json({ message: 'Author not found' });
		}

		res.json(updatedAuthor);
	} catch (err) {
		next(err);
	}
};

exports.authorFetch = async (req, res, next) => {
	try {
		const author = await Author.findOne({}).populate('imageFile');
		if (!author) {
			return res.status(404).json({ message: 'Author not found' });
		}

		res.json(author);
	} catch (err) {
		next(err);
	}
};

exports.authorInfoFetch = async (req, res, next) => {
	try {
		const author = await Author.findOne({}).
			select('-email -username -createdAt -updatedAt');

		if (!author) {
			return res.status(404).json({ message: 'Author not found' });
		}

		res.json(author);
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
				.json({
					errors: [...errors.array(), {
						msg: 'You are only allowed to have one account'
					}]
				});
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
			return res.status(401).json({
				errors: [
					{ msg: 'invalid username or password' }
				]
			});
		}

		const authorForToken = {
			username: author.username,
			id: author._id,
		};

		const token = jwt.sign(
			authorForToken,
			SECRET_KEY,
			// expires in 2 hours
			{ expiresIn: '2d' }
		);

		res.json({
			token,
			username: author.username,
			name: author.name
		});
	} catch (err) {
		next(err);
	}
};