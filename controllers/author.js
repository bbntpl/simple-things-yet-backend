const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Author = require('../models/author');
const { SECRET_KEY } = require('../utils/config');

exports.authorUpdate = async (req, res) => {
	const { name, bio } = req.body;
	const authorId = req.author.id;

	const updatedAuthor = await Author.findByIdAndUpdate(
		authorId,
		{ $set: { name, bio } },
		{ new: true }
	);

	if (!updatedAuthor) {
		return res.status(404).json({ error: 'Author not found' });
	}

	res.json(updatedAuthor);
}

exports.authorFetch = async (req, res) => {
	const author = await Author.findOne({});

	if (!author) {
		return res.status(404).json({ error: 'Author not found' });
	}

	res.json(author);
}

exports.authorRegister = async (req, res) => {
	const { email, username, password } = req.body;

	const passwordHash = await bcrypt.hash(password, 10);

	const author = new Author({
		name: '',
		bio: '',
		email,
		username,
		passwordHash,
	});

	const savedAuthor = await author.save();
	res.status(201).json(savedAuthor);
}

exports.authorLogin = async (req, res) => {
	const { username, password } = req.body;

	const author = await Author.findOne({ username });

	const passwordCorrect = author
		? await bcrypt.compare(password, author.passwordHash)
		: false;

	if (!(author && passwordCorrect)) {
		return res.status(401).json({ error: 'invalid username or password' });
	}

	const authorForToken = {
		username: author.username,
		id: author._id,
	};

	const token = jwt.sign(authorForToken, SECRET_KEY);

	res.json({ token, username: author.username });
}