const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Author = require('../models/author');
const { SECRET_KEY } = require('../utils/config');

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
}

exports.authorFetch = async (req, res) => {
	const author = await Author.findOne({});

	if (!author) {
		return res.status(404).json({ error: 'Author not found' });
	}

	res.json(author);
}

exports.authorRegister = async (req, res, next) => {
	const { email, username, password } = req.body;
	const numOfAuthors = await Author.countDocuments({});

	if (numOfAuthors >= 1) {
		return res.status(403)
			.json('message: You are only allowed to have one account');
	}

	const passwordHash = await bcrypt.hash(password, 10);
	const author = new Author({
		name: username,
		bio: 'Update this bio',
		email,
		username,
		passwordHash,
	});

	await author.save()
		.then(savedDoc => {
			res.status(201).json(savedDoc);
		})
		.catch(err => next(err));
}

exports.authorLogin = async (req, res) => {
	const { username, password } = req.body;

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

	const token = jwt.sign(authorForToken, SECRET_KEY);

	res.json({ token, username: author });
}