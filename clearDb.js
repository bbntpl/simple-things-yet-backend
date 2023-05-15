const Author = require('./models/author');
const Blog = require('./models/blog');
const Category = require('./models/category');
const Comment = require('./models/comment');
const Viewer = require('./models/viewer');

const mongoose = require('mongoose');
const { MONGODB_URI } = require('./utils/config');

async function connectDB() {
	try {
		await mongoose.connect(MONGODB_URI);
	} catch (error) {
		console.log(`Error connecting to MongoDB: ${error}`);
	}
}

async function clearDb() {
	await Blog.deleteMany({});
	await Comment.deleteMany({});
	await Category.deleteMany({});
	await Author.deleteMany({});
	await Viewer.deleteMany({});
}

connectDB()
	.then(() => {
		clearDb()
			.then(() => {
				console.log('All MongoDB collections are cleared');
				mongoose.connection.close();
			})
			.catch((err) => {
				console.error(err);
			});
	});

