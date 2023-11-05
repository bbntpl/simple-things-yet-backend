const Author = require('../models/author');
const Blog = require('../models/blog');
const Tag = require('../models/tag');
const Comment = require('../models/comment');
const Viewer = require('../models/viewer');

const mongoose = require('mongoose');
const { MONGODB_URI } = require('./config');
const clearUploads = require('./clearUploads');
const Category = require('../models/category');
const ImageFile = require('../models/image-file');

function connectDB() {
	try {
		mongoose.connect(MONGODB_URI);
	} catch (error) {
		console.log(`Error connecting to MongoDB: ${error}`);
	}
}

// Delete the collections from the database for development
async function clearDb() {
	await Blog.deleteMany({});
	await Comment.deleteMany({});
	await Tag.deleteMany({});
	await Author.deleteMany({});
	await Viewer.deleteMany({});
	await Category.deleteMany({});
	await ImageFile.deleteMany({});
}

connectDB()
	.then(async () => {
		const conn = mongoose.connection;
		await clearUploads(conn);
		await clearDb();
		console.log('All MongoDB collections are cleared');
		mongoose.connection.close();
	})
	.catch((err) => {
		console.error(err);
	});