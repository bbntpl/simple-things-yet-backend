const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const { SECRET_KEY } = require('./config');
const Author = require('../models/author');
const Viewer = require('../models/viewer');

const logger = morgan('tiny');

const tokenExtractor = (req, res, next) => {
	// code that extracts the token
	const authorization = req.get('authorization')
	if (authorization && authorization.startsWith('Bearer ')) {
		req.token = authorization.substring(7)
	}

	next()
}

const errorHandler = (err, req, res, next) => {
	console.error(err.message);

	if (err.name === 'CastError') {
		return res.status(400).send({ error: 'malformatted id' });
	} else if (err.name === 'ValidationError') {
		return res.status(400).json({ error: err.message });
	} else if (err.name === 'JsonWebTokenError') {
		return res.status(401).json({ error: 'invalid token' });
	}

	next(err);
};

const unknownEndpoint = (req, res) => {
	res.status(404).send('Your page is not found')
}

const serverErrorHandler = (err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Internal server error' });
}

const authenticateUser = (Schema) => async (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await Schema.findById(decoded.id);

    if (!user) {
      throw new Error('Authentication failed');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = {
	logger,
	tokenExtractor,
	authenticateUser,
	unknownEndpoint,
	errorHandler,
	serverErrorHandler
};