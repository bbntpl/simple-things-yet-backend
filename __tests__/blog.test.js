const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const Blog = require('../models/blog');
const Viewer = require('../models/viewer');
const Author = require('../models/author');
const { MONGODB_URI } = require('../utils/config');
const {
	deleteDbsForBlogTests,
	loginAuthor,
	populateBlogsDb,
	blogsInDb,
	authorsInDb,
} = require('../utils/testHelpers');
const {
	sampleAuthor1,
	sampleBlog2,
	sampleBlog1
} = require('../utils/testDataset');
const Comment = require('../models/comment');

let server;
const request = supertest(app);

let token;

beforeAll(async () => {
	server = await initApp();
})

beforeEach(async () => {
	await deleteDbsForBlogTests();
	await populateBlogsDb();

	token = null;
	token = await loginAuthor(request, sampleAuthor1);
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

describe('initial database', () => {
	test('should connect to the test database', async () => {
		expect(mongoose.connection.readyState).toBe(1);
		expect(mongoose.connection._connectionString).toBe(MONGODB_URI);
	});

	test('should add the initial data', async () => {
		const blogs = await Blog.find({});
		const authors = await Author.find({});
		const viewers = await Viewer.find({});
		expect(blogs.length).toBe(1);
		expect(authors.length).toBe(1);
		expect(viewers.length).toBe(1);
	});
})


describe('view blogs', () => {
	test('should return blogs as json', async () => {
		const blogs = await getBlogs();
		const initialBlog = blogs.body[0]

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
		expect(initialBlog.author.id).toEqual(author.id.toString())
		expect(initialBlog.author.name).toEqual(author.name)
		expect(initialBlog.author.bio).toEqual(author.bio)
	});
});

describe('creation of blog', () => {
	test('should add a valid blog', async () => {
		await postBlog(sampleBlog2, token);
		const blogs = await getBlogs();

		const titles = blogs.body.map(r => r.title);
		const contents = blogs.body.map(r => r.content);
		expect(titles).toContain(sampleBlog2.title);
		expect(contents).toContain(sampleBlog2.content);
		expect(blogs.body).toHaveLength(2);
	});

	test('should include reference to the only author', async () => {
		const author = (await authorsInDb())[0];

		await postBlog(sampleBlog2, token);
		const blogs = await getBlogs();

		const isOnlyAuthorReferenced = blogs.body.filter(blog => {
			return blog.author.id === author.id;
		})
		expect(isOnlyAuthorReferenced.length)
			.toHaveLength(2);
	});
});

describe('deletion of blog', () => {
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

	test('should delete a blog and its associated comments', async () => {
		const blogToDelete = (
			await request.get('/api/blogs')
				.set('Authorization', `Bearer ${token}`)
		).body[0];

		// Create a comment associated with the blog
		const newComment = {
			content: 'Test Comment',
			blog: blogToDelete.id,
		};

		const savedComment = await Comment.create(newComment);

		await request.delete(`/api/blogs/${blogToDelete.id}`).expect(204);

		// Check that the blog and its associated comment are deleted
		const blogsAtEnd = await request.get('/api/blogs');
		const commentsAtEnd = await Comment.find({});
		expect(blogsAtEnd.body).not.toContainEqual(blogToDelete);
		expect(commentsAtEnd).not.toContainEqual(savedComment);
	});
});

describe('update of blog', () => {
	test('should update a blog', async () => {
		const blogsAtStart = await request.get('/api/blogs');
		const blogToUpdate = blogsAtStart.body[0];

		const updatedBlog = {
			...blogToUpdate,
			title: 'Updated Title',
		};

		await request
			.put(`/api/blogs/${blogToUpdate.id}`)
			.send(updatedBlog)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedTitles = blogsAtEnd.body.map(r => r.title);
		expect(updatedTitles).toContain(updatedBlog.title);
	});

	test('should verify that updatedAt gets modified every blog update', async () => {
		const initialBlogs = await request.get('/api/blogs')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogToUpdate = initialBlogs.body[0];

		const updatedAtStart = blogToUpdate.updatedAt;

		const updatedBlog = {
			...blogToUpdate,
			title: 'new title babyyy',
		};

		await request
			.put(`/api/blogs/${blogToUpdate.id}`)
			.send(updatedBlog)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedAtEnd = blogsAtEnd.body[0].updatedAt;
		expect(updatedAtEnd).not.toBe(updatedAtStart);
	});

	test('should verify that the blog is not private', async () => {
		const blogsAtStart = await Blog.find({});
		const blogToUpdate = blogsAtStart[0];

		// Update the blog by toggling the private property
		await request
			.put(`/api/blogs/${blogToUpdate.id}`)
			.send({ ...blogToUpdate, private: !blogToUpdate.private })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await Blog.find({});
		expect(blogsAtEnd[0].private).toBeFalsy();
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Blog Tests: Close the server')
});