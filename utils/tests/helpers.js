const bcrypt = require('bcrypt');
const path = require('path');

const Author = require('../../models/author');
const Viewer = require('../../models/viewer');
const Tag = require('../../models/tag');
const Blog = require('../../models/blog');
const Comment = require('../../models/comment');
const {
	sampleAuthor1,
	sampleViewer1,
	sampleBlog1,
	sampleComment1,
	sampleTag1,
	sampleTag2,
	sampleComment2,
	sampleCategory1,
	sampleCategory2,
} = require('./dataset');
const Category = require('../../models/category');
const ImageFile = require('../../models/image-file');

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

const clearDb = async () => {
	await Blog.deleteMany({});
	await Comment.deleteMany({});
	await Tag.deleteMany({});
	await Author.deleteMany({});
	await Viewer.deleteMany({});
	await Category.deleteMany({});
	await ImageFile.deleteMany({});
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

const populateTagsDb = async () => {
	const tag1 = new Tag(sampleTag1);
	const tag2 = new Tag(sampleTag2);

	await tag1.save();
	await tag2.save();
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
	return response.body.token;
};

const loginViewer = async (api, viewer) => {
	const response = await api
		.post('/api/viewers/login')
		.send({
			username: viewer.username,
			password: viewer.password
		});
	return response.body.token;
};

const postBlog = async (api, data) => {
	const { blog, token, publishAction } = data;
	if (!['save', 'publish'].includes(publishAction)) {
		throw new Error('Invalid post type');
	}

	const filePath = path.join(__dirname, '../../images/dbdiagram.png');
	return await api
		.post(`/api/blogs/${publishAction}`)
		.field('title', blog.title)
		.field('content', blog.content)
		.field('tags', blog.tags)
		.field('isPrivate', blog.isPrivate)
		.field('likes', blog.likes)
		.field('category', blog.category === null ? 'NULL' : blog.category)
		.attach('blogImage', filePath, 'image.png')
		.set('Authorization', `Bearer ${token}`)
		.expect('Content-Type', /application\/json/)
		.expect(201);
};

const saveBlog = async (api, data) => await postBlog(api, {
	blog: data.blog,
	token: data.token,
	publishAction: 'save'
});

const publishBlog = async (api, data) => await postBlog(api, {
	blog: data.blog,
	token: data.token,
	publishAction: 'publish'
});

const createCategoryWithImage = async (api, data) => {
	const { category, token } = data;
	const filePath = path.join(__dirname, '../../images/dbdiagram.png');

	const newCategory = await api
		.post('/api/categories')
		.field('name', category.name)
		.field('description', category.description)
		.attach('categoryImage', filePath, 'image.png')
		.set('Authorization', `Bearer ${token}`)
		.expect(201);

	return newCategory;
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

const tagsInDb = async () => {
	const tags = await Tag.find({});
	return tags.map(tag => tag.toJSON());
};

const imageDocsInDb = async () => {
	const imageDocs = await ImageFile.find({});
	return imageDocs.map(doc => doc.toJSON());
};

module.exports = {
	deleteDbsForBlogTests,
	createInitialAuthor,
	createInitialViewer,
	loginAuthor,
	loginViewer,
	saveBlog,
	publishBlog,
	createCategoryWithImage,
	populateBlogsDb,
	populateCategoriesDb,
	populateTagsDb,
	authorsInDb,
	blogsInDb,
	categoriesInDb,
	tagsInDb,
	commentsInDb,
	viewersInDb,
	imageDocsInDb,
	clearDb
};