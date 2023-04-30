const bcrypt = require('bcrypt');

const Author = require('../models/author');
const Viewer = require('../models/viewer');
const Category = require('../models/category');
const Blog = require('../models/blog');
const Comment = require('../models/comment');
const {
	sampleAuthor1,
	sampleViewer1,
	sampleBlog1,
	sampleComment1,
	sampleCategory1,
	sampleCategory2,
} = require('../utils/testDataset');

const deleteDbsForBlogTests = async ({
	deleteCommentCollection = false
} = {}) => {
	await Author.deleteMany({});
	await Viewer.deleteMany({});
	await Blog.deleteMany({});

	if (deleteCommentCollection) {
		await Comment.deleteMany({});
	}
}

const createInitialAuthor = async (sampleAuthor = sampleAuthor1) => {
	const { password, ...authorWithoutPassword } = sampleAuthor;

	const passwordHash = await bcrypt.hash('testpassword', 10);
	const author = new Author({
		...authorWithoutPassword,
		passwordHash,
	});
	await author.save();

	return author;
};

const createInitialViewer = async (sampleViewer = sampleViewer1) => {
	const { password, ...viewerWithoutPassword } = sampleViewer;

	const passwordHash = await bcrypt.hash('testpassword', 10);
	const viewer = new Viewer({
		...viewerWithoutPassword,
		passwordHash
	});

	await viewer.save();

	return viewer;
};

const createInitialComment = async ({
	sampleComment = sampleComment1,
	viewer, // This has no default value
	blog, // This has no default value
} = {}) => {
	const comment = new Comment({
		...sampleComment,
		viewer,
		blog
	});

	await comment.save();

	return comment;
};

const populateBlogsDb = async ({
	allowComment = false,
	sampleBlog = sampleBlog1
} = {}) => {
	const author = await createInitialAuthor();
	const viewer = await createInitialViewer();
	const blog = await Blog.create({
		...sampleBlog,
		author: author.id,
		likes: [viewer.id],
	});
	if (allowComment) {
		const comment = await createInitialComment({
			viewer: viewer.id,
			blog: blog.id
		});
		await blog.updateOne({
			$push:
				{ comments: comment.id }
		});
	}
};

const populateCategoriesDb = async () => {
	const category1 = new Category(sampleCategory1);
	const category2 = new Category(sampleCategory2);

	await category1.save();
	await category2.save();
}

const loginAuthor = async (api, author) => {
	const response = await api
		.post('/api/author/login')
		.send({
			username: author.username,
			password: author.password
		});
	return response.body.token;
}

const loginViewer = async (api, viewer) => {
	const response = await api
		.post('/api/viewer/login')
		.send({
			username: viewer.username,
			password: viewer.password
		});
	return response.body.token;
}

const blogsInDb = async () => {
	const blogs = await Blog.find({})
	return blogs.map(blog => blog.toJSON())
}

const commentsInDb = async () => {
	const comments = await Comment.find({})
	return comments.map(comment => comment.toJSON())
}

const authorsInDb = async () => {
	const authors = await Author.find({})
	return authors.map(author => author.toJSON())
}

const viewersInDb = async () => {
	const viewers = await Viewer.find({})
	return viewers.map(viewer => viewer.toJSON())
}

const categoriesInDb = async () => {
	const categories = await Category.find({});
	return categories.map(category => category.toJSON())
}

module.exports = {
	deleteDbsForBlogTests,
	createInitialAuthor,
	createInitialViewer,
	loginAuthor,
	loginViewer,
	populateBlogsDb,
	populateCategoriesDb,
	authorsInDb,
	blogsInDb,
	categoriesInDb,
	commentsInDb,
	viewersInDb,
};