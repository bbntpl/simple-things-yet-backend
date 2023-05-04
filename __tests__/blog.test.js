const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const {
	deleteDbsForBlogTests,
	loginAuthor,
	populateBlogsDb,
	blogsInDb,
	authorsInDb,
	commentsInDb,
	loginViewer,
} = require('../utils/testHelpers');
const {
	sampleAuthor1,
	sampleBlog2,
	sampleBlog1,
	sampleCategory1,
	sampleViewer1
} = require('../utils/testDataset');
const Category = require('../models/category');
const Blog = require('../models/blog');
const Viewer = require('../models/viewer');

let server;
let token;

const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
});

const postBlog = async (blog, token) => {
	return await request
		.post('/api/blogs')
		.send(blog)
		.set('Authorization', `Bearer ${token}`)
		.expect('Content-Type', /application\/json/)
		.expect(201);
};

const getBlogs = async () => {
	return await request.get('/api/blogs')
		.expect('Content-Type', /application\/json/)
		.expect(200);
};

describe('fetching blogs', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should return blogs as json', async () => {
		const blogs = await getBlogs();
		const initialBlog = blogs.body[0];

		expect(initialBlog.content).toEqual(sampleBlog1.content);
		expect(initialBlog.title).toEqual(sampleBlog1.title);
		expect(initialBlog.private).toBeTruthy();
	});

	test('should return specific blog', async () => {
		const blog = (await blogsInDb())[0];
		const response = await request
			.get(`/api/blogs/${blog.id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const initialBlog = response.body;
		expect(initialBlog.content).toEqual(blog.content);
		expect(initialBlog.title).toEqual(blog.title);
		expect(initialBlog.private).toBeTruthy();
	});

	test('should be associated to the initial author', async () => {
		const blog = (await blogsInDb())[0];
		const author = (await authorsInDb())[0];

		const response = await request
			.get(`/api/blogs/${blog.id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const initialBlog = response.body;
		expect(initialBlog.author.id).toEqual(author.id.toString());
		expect(initialBlog.author.name).toEqual(author.name);
		expect(initialBlog.author.bio).toEqual(author.bio);
	});
});

describe('creation of blog', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should add a valid blog', async () => {
		await postBlog(sampleBlog2, token);
		const response = await getBlogs();

		const blogs = response.body;

		const titles = blogs.map(r => r.title);
		const contents = blogs.map(r => r.content);
		expect(titles).toContain(sampleBlog2.title);
		expect(contents).toContain(sampleBlog2.content);
		expect(blogs).toHaveLength(2);
	});

	test('should include reference to the only author', async () => {
		const author = (await authorsInDb())[0];
		await postBlog(sampleBlog2, token);
		const response = await getBlogs();

		const blogs = response.body;

		// Making sure both blogs are owned by the only author
		// by verifying the presence of the associated id
		const isOnlyAuthorReferenced
			= blogs.reduce((total, blog) => {
				if (blog.author.toString() === author.id.toString()) {
					return total + 1;
				}
			}, 0) === 2;
		expect(isOnlyAuthorReferenced).toBeTruthy();
	});
});

describe('deletion of blog', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests({
			deleteCommentCollection: true
		});
		await populateBlogsDb({
			allowComment: true
		});

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should delete a blog', async () => {
		const blogsAtStart = await request.get('/api/blogs')
			.expect('Content-Type', /application\/json/)
			.expect(200);
		const blogToDelete = blogsAtStart.body[0];

		await request
			.delete(`/api/blogs/${blogToDelete.id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(204);

		const blogsAtEnd = await request.get('/api/blogs');
		expect(blogsAtEnd.body).toHaveLength(blogsAtStart.body.length - 1);
	});

	test('should delete a blog and its associated comments should not get deleted', async () => {
		const blogToDelete = (
			await request.get('/api/blogs')
		).body[0];

		await request.delete(`/api/blogs/${blogToDelete.id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(204);

		// Check that the blog and its associated comment are deleted
		const blogsAtEnd = await request.get('/api/blogs');
		const commentsAtEnd = await commentsInDb();

		expect(blogsAtEnd.body).not.toContainEqual(blogToDelete);
		expect(commentsAtEnd).toHaveLength(1);
	});
});

describe('update of blog', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should update a blog', async () => {
		const blogsAtStart = await request.get('/api/blogs');
		const blogToUpdate = blogsAtStart.body[0];

		const updatedBlog = {
			...blogToUpdate,
			title: 'new title babyyy',
		};

		await request
			.put(`/api/blogs/${blogToUpdate.id}/authors-only`)
			.send(updatedBlog)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedTitles = blogsAtEnd.body.map(r => r.title);
		expect(updatedTitles).toContain(updatedBlog.title);
	});

	test('should verify that updatedAt gets modified every blog update', async () => {
		const initialBlogs = await request.get('/api/blogs')
			.expect(200);

		const blogToUpdate = initialBlogs.body[0];

		const updatedAtStart = blogToUpdate.updatedAt;

		const updatedBlog = {
			...blogToUpdate,
			title: 'new title babyyy',
		};

		await request
			.put(`/api/blogs/${blogToUpdate.id}/authors-only`)
			.send(updatedBlog)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedAtEnd = blogsAtEnd.body[0].updatedAt;
		expect(updatedAtEnd).not.toBe(updatedAtStart);
	});

	test('should successfully add category to blog', async () => {
		const blogsAtStart = await blogsInDb();
		const blogToUpdate = blogsAtStart[0];

		const category = new Category(sampleCategory1);
		await category.save();

		// Update the blog to add category association
		await request
			.put(`/api/blogs/${blogToUpdate.id}/authors-only`)
			.send({
				...blogToUpdate,
				categories: [
					...blogToUpdate.categories,
					category._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		const updatedCategory = await Category.findById(category._id);

		expect(blogsAtEnd[0].categories).toHaveLength(1);
		expect(blogsAtEnd[0].categories.map(String)).toContain(category._id.toString());
		expect(updatedCategory.blogs).toHaveLength(1);
		expect(updatedCategory.blogs.map(String)).toContain(blogsAtEnd[0].id.toString());

		await Category.deleteMany({});
	});

	test('should remove blog reference within category after uncategorization', async () => {
		const blogToUpdate = await Blog.findOne({});
		const category = new Category(sampleCategory1);

		// Add blog reference to category
		category.blogs.push(blogToUpdate._id);
		await category.save();

		// Add category reference to blog
		blogToUpdate.categories.push(category._id);
		await blogToUpdate.save();

		expect(category.blogs).toHaveLength(1);
		expect(blogToUpdate.categories).toHaveLength(1);

		// Update the blog to remove the category association
		await request
			.put(`/api/blogs/${blogToUpdate.id}/authors-only`)
			.send({ ...blogToUpdate.toObject(), categories: [] })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		// Fetch the updated category from the database
		const updatedCategory = await Category.findById(category._id);

		// Verify that the blog reference is removed from the category
		expect(updatedCategory.blogs).toHaveLength(0);
		expect(updatedCategory.blogs).not.toContain(blogToUpdate._id);

		await Category.deleteMany({});
	});

	test('should verify that the blog is not private', async () => {
		const blogsAtStart = await blogsInDb();
		const blogToUpdate = blogsAtStart[0];

		// Update the blog by toggling the private property
		await request
			.put(`/api/blogs/${blogToUpdate.id}/authors-only`)
			.send({ ...blogToUpdate, private: !blogToUpdate.private })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		expect(blogsAtEnd[0].private).toBeFalsy();
	});
});

describe('liking a blog feature', () => {
	let blog;
	let viewer;
	let blogToUpdate;

	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
		token = null;
		token = await loginViewer(request, sampleViewer1);

		// initialize blog and viewer every test
		blog = await Blog.findOne({});
		viewer = await Viewer.findOne({});
		blogToUpdate = {
			title: blog.title,
			content: blog.content,
			author: blog.author,
			private: blog.private,
			createdAt: blog.createdAt,
			updatedAt: blog.updatedAt,
			comments: blog.comments,
			categories: blog.categories
		};
	});

	test('should allow user/viewer to like a blog', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());
	});

	test('should only allow user/viewer to like a blog once', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());

		// attempt for 2nd like
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlogForThe2ndTime = await Blog.findOne({});
		expect(updatedBlogForThe2ndTime.likes).toHaveLength(1);
	});

	test('should allow a user/viewer to unlike a blog that was liked prevoiusly', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());

		const filteredLikes = updatedBlog
			.likes.filter(id => !id.equals(viewer._id));

		// attempt for 2nd like
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: filteredLikes
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlogForThe2ndTime = await Blog.findOne({});
		expect(updatedBlogForThe2ndTime.likes).toHaveLength(0);
		expect(updatedBlogForThe2ndTime.likes.map(String))
			.not.toContain(viewer._id.toString());
	});

	test('should contain the correct amount of likes by users/viewers', async () => {
		const initialLikesCount = blog.likes.length;
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes).toHaveLength(initialLikesCount + 1);
	});

	test('should not allow unauthorized user/viewer to like a blog', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.expect(401);
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Blog Tests: Close the server');
});