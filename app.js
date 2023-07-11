const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');

const {
	logger,
	tokenExtractor,
	errorHandler,
	serverErrorHandler,
	unknownEndpoint
} = require('./utils/middleware');
const {
	PORT,
	MONGODB_URI,
	NODE_ENV,
} = require('./utils/config');
const authorRouter = require('./routes/author');
const blogsRouter = require('./routes/blogs');
const tagsRouter = require('./routes/tags');
const commentsRouter = require('./routes/comments');
const viewersRouter = require('./routes/viewers');
const categoriesRouter = require('./routes/categories');

const app = express();

// Setup connection to MongoDB
mongoose.set('strictQuery', false);

async function connectDB() {
	try {
		await mongoose.connect(MONGODB_URI);
	} catch (error) {
		console.log(`Error connecting to MongoDB: ${error}`);
	}
}

async function initApp() {
	try {
		await connectDB();
		const server = app.listen(PORT, function (err) {
			if (err) {
				console.log(`Error: ${err}`);
			}
			console.log(`App is connected to port ${PORT}`);
		});

		return server;
	} catch (err) {
		console.log(`Error: ${err}`);
	}
}

//Use middleware functions
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(logger);
app.use(tokenExtractor);

app.use(express.urlencoded({ extended: true }));

// Setup routes
app.use('/api/author', authorRouter);
app.use('/api/blogs', blogsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/viewer', viewersRouter);
app.use('/api/categories', categoriesRouter);

// Setup error handlers as middleware
app.use(unknownEndpoint);
app.use(errorHandler);
app.use(serverErrorHandler);

if (NODE_ENV !== 'test') {
	initApp();
}

module.exports = { app, initApp };