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
	sampleComment2,
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
};

const createInitialUser = async (UserModel, sampleUser) => {
	const { password, ...userWithoutPassword } = sampleUser;

	const passwordHash = await bcrypt.hash(password, 10);
	const user = new UserModel({
		...userWithoutPassword,
		passwordHash,
	});
	await user.save();

	return user;
};

const createInitialAuthor = async (sampleAuthor = sampleAuthor1) => {
	return createInitialUser(Author, sampleAuthor);
};

const createInitialViewer = async (sampleViewer = sampleViewer1) => {
	return createInitialUser(Viewer, sampleViewer);
};


const createInitialComment = async ({
	sampleComment = sampleComment1,
	user,
	userType,
	blog,
	parentComment,
} = {}) => {
	const comment = new Comment({
		...sampleComment,
		[userType]: user,
		parentComment,
		blog
	});
	await comment.save();

	return comment;
};

const createCommentForBlog = async (blog, viewer, author, isReply = false, parentComment = null) => {
	const comment = await createInitialComment({
		sampleComment: isReply ? sampleComment2 : sampleComment1,
		userType: viewer !== null ? 'viewer' : 'author',
		user: viewer !== null ? viewer._id : author._id,
		blog: blog.id,
		...(isReply && parentComment !== null ? { parentComment: parentComment._id } : {}),
	});

	await blog.updateOne({
		$push: { comments: comment.id },
	});

	if (isReply) {
		await parentComment.updateOne({
			$push: { replies: comment.id },
		});
	}

	await (viewer !== null ? viewer : author).updateOne({
		$push: { comments: comment.id },
	});

	return comment;
};

const populateBlogsDb = async ({
	viewerIsCommenter = true,
	allowComment = false,
	allowReply = false,
	sampleBlog = sampleBlog1,
} = {}) => {
	const author = await createInitialAuthor();
	const viewer = await createInitialViewer();
	const blog = await Blog.create({
		...sampleBlog,
		author: author.id,
	});

	if (allowComment) {
		const parentComment = await createCommentForBlog(
			blog,
			viewerIsCommenter ? viewer : null,
			!viewerIsCommenter ? author : null
		);

		if (allowReply) {
			await createCommentForBlog(
				blog,
				viewerIsCommenter ? viewer : null,
				!viewerIsCommenter ? author : null,
				true,
				parentComment);
		}
	}
};

const populateCategoriesDb = async () => {
	const category1 = new Category(sampleCategory1);
	const category2 = new Category(sampleCategory2);

	await category1.save();
	await category2.save();
};

const loginAuthor = async (api, author) => {
	const response = await api
		.post('/api/author/login')
		.send({
			username: author.username,
			password: author.password
		});
	response.body.token;
};

const loginViewer = async (api, viewer) => {
	const response = await api
		.post('/api/viewer/login')
		.send({
			username: viewer.username,
			password: viewer.password
		});
	response.body.token;
};

const blogsInDb = async () => {
	const blogs = await Blog.find({});
	return blogs.map(blog => blog.toJSON());
};

const commentsInDb = async () => {
	const comments = await Comment.find({});
	return comments.map(comment => comment.toJSON());
};

const authorsInDb = async () => {
	const authors = await Author.find({});
	return authors.map(author => author.toJSON());
};

const viewersInDb = async () => {
	const viewers = await Viewer.find({});
	return viewers.map(viewer => viewer.toJSON());
};

const categoriesInDb = async () => {
	const categories = await Category.find({});
	return categories.map(category => category.toJSON());
};

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