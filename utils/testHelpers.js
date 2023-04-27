const bcrypt = require('bcrypt');

const Author = require('../models/author');
const Viewer = require('../models/viewer');
const Category = require('../models/category');
const Blog = require('../models/blog');
const Comment = require('../models/comment');

const deleteDbsForBlogTests = async () => {
	await Author.deleteMany({});
	await Viewer.deleteMany({});
	await Blog.deleteMany({});
}

const deleteDbs = async () => {
	await Author.deleteMany({});
	await Viewer.deleteMany({});
	await Category.deleteMany({});
	await Blog.deleteMany({});
	await Comment.deleteMany({});
}

const createInitialAuthor = async ({
	name = 'Test Author',
	username = 'Test Username',
	bio = 'Test Bio',
	email = 'testauthor@gmail.com',
	password = 'testpassword',
} = {}) => {
	const passwordHash = await bcrypt.hash(password, 10);

	const author = new Author({ name, bio, email, username, passwordHash });
	await author.save();
	return author;
};

const createInitialViewer = async ({
	username = 'Test Username',
	name = 'Test Viewer',
	password = 'testpassword',
} = {}) => {
	const passwordHash = await bcrypt.hash(password, 10);

	const viewer = new Viewer({ name, username, passwordHash });
	await viewer.save();
	return viewer;
};

module.exports = {
	deleteDbs,
	deleteDbsForBlogTests,
	createInitialAuthor,
	createInitialViewer,
};
