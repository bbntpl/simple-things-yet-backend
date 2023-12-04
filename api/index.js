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
} = require('../utils/middleware');

const {
	NODE_ENV,
} = require('../utils/config');
const authorRouter = require('../routes/author');
const blogsRouter = require('../routes/blogs');
const tagsRouter = require('../routes/tags');
const commentsRouter = require('../routes/comments');
const viewersRouter = require('../routes/viewers');
const categoriesRouter = require('../routes/categories');
const imageFilesRouter = require('../routes/image-files');
const { initApp } = require('../init');

const app = express();

// Setup connection to MongoDB
mongoose.set('strictQuery', false);

//Use middleware functions
app.use(helmet({
	crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(logger);
app.use(tokenExtractor);

// Setup routes
app.use('/api/author', authorRouter);
app.use('/api/blogs', blogsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/viewers', viewersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/images', imageFilesRouter);

// Setup error handlers as middleware
app.use(unknownEndpoint);
app.use(errorHandler);
app.use(serverErrorHandler);

if (NODE_ENV !== 'test') {
	initApp(app);
}

module.exports = app;