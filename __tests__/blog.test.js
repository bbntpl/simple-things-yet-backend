const supertest = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Blog = require('../models/blog');
const {
	createInitialAuthor,
	createInitialViewer,
	deleteDbsForBlogTests
} = require('../utils/testHelpers');
const Author = require('../models/author');

const request = supertest(app);

// Initial test data
const createInitialData = async () => {
	const author = await createInitialAuthor();
	const viewer = await createInitialViewer();
	const blog = {
		title: 'Test Blog',
		content: 'This is a test blog content',
		author: initialAuthor.id,
		likes: [viewer.id],
		comments: [],
		categories: [],
		private: true,
	};

	return {
		author,
		initialViewer,
		blog,
	};
};

let initialData;

beforeEach(async () => {
	initialData = await createInitialData();
	await deleteDbsForBlogTests();
	await Blog.create(initialData.blog);
});

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


// View Blogs - currently working on it
describe('view blogs', () => {
	test('should return blogs as json', async () => {
		const response = await request
			.get('/api/blogs')
			.expect(200)
			.expect('Content-Type', /application\/json/);
			
			expect(response.body[0]).toContain(initialData.blog)
	});

	test('should be associated to the initial author', async () => {
		const response = await request
			.get('/api/blogs')
			.expect(200)
			.expect('Content-Type', /application\/json/);
		const author = await Author.findOne({})


		expect(response.body[0]).toContain(author._id)
	});

	test('should verify that the viewer likes the blog', async () => {
		const blogs = await Blog.find({}).populate('viewers');
		expect(blogs[0].viewers[0].name).toBe('Test Viewer');
	});

	test('should verify that the blog is not private', async () => {
		const blogs = await Blog.find({});
		expect(blogs[0].private).toBe(false);
	});
	
});

// Creation of blog
describe('creation of blog', () => {
	test('should add a valid blog', async () => {
		await request
			.post('/api/blogs')
			.send(initialBlog)
			.expect(200)
			.expect('Content-Type', /application\/json/);

		const response = await request.get('/api/blogs');
		const titles = response.body.map(r => r.title);
		expect(titles).toContain(initialBlog.title);
	});
});

// Deletion of blog
describe('deletion of blog', () => {
	test('should delete a blog', async () => {
		const blogsAtStart = await request.get('/api/blogs');
		const blogToDelete = blogsAtStart.body[0];

		await request
			.delete(`/api/blogs/${blogToDelete.id}`)
			.expect(204);

		const blogsAtEnd = await request.get('/api/blogs');
		expect(blogsAtEnd.body).toHaveLength(blogsAtStart.body.length - 1);
	});
});

// Update of blog
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
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedTitles = blogsAtEnd.body.map(r => r.title);
		expect(updatedTitles).toContain(updatedBlog.title);
	});
});

afterAll(() => {
	mongoose.connection.close();
});