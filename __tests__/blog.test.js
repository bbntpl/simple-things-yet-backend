const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const { MONGODB_URI } = require('../utils/config');
const {
	deleteDbsForBlogTests,
	loginAuthor,
	populateBlogsDb,
	blogsInDb,
	authorsInDb,
	commentsInDb,
	viewersInDb,
} = require('../utils/testHelpers');
const {
	sampleAuthor1,
	sampleBlog2,
	sampleBlog1,
	sampleCategory1
} = require('../utils/testDataset');
const Category = require('../models/category');
const Blog = require('../models/blog');

let server;
let token;

const request = supertest(app);


beforeAll(async () => {
	server = await initApp();
})

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
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});
	test('should connect to the test database', async () => {
		expect(mongoose.connection.readyState).toBe(1);
		expect(mongoose.connection._connectionString).toBe(MONGODB_URI);
	});
	test('should add the initial data', async () => {
		const blogs = await blogsInDb();
		const authors = await authorsInDb();
		const viewers = await viewersInDb();
		expect(blogs.length).toBe(1);
		expect(authors.length).toBe(1);
		expect(viewers.length).toBe(1);
	});
})


describe('view blogs', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});
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
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});
	test('should add a valid blog', async () => {
		await postBlog(sampleBlog2, token);
		const blogs = await getBlogs();

		const titles = blogs.body.map(r => r.title);
		const contents = blogs.body.map(r => r.content);
		expect(titles).toContain(sampleBlog2.title);
		expect(contents).toContain(sampleBlog2.content);
		expect(blogs.body).toHaveLength(2);
		const commentsAtEnd = await commentsInDb();
	});

	test('should include reference to the only author', async () => {
		const author = (await authorsInDb())[0];
		await postBlog(sampleBlog2, token);
		const blogs = await getBlogs();

		// Making sure both blogs owned by the only author
		// by verifying the associated id is present
		const isOnlyAuthorReferenced
			= blogs.body.reduce((total, blog) => {
				if (blog.author.id == author.id); {
					return total += 1;
				}
			}, 0) === 2;
		expect(isOnlyAuthorReferenced).toBeTruthy();
		const commentsAtEnd = await commentsInDb();
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

	test('should delete a blog and its associated comments', async () => {
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
		expect(commentsAtEnd).toHaveLength(0);
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
			.put(`/api/blogs/${blogToUpdate.id}`)
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
		const category = new Category(sampleCategory1);
		const blogToUpdate = await Blog.findOne({});

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
			.put(`/api/blogs/${blogToUpdate.id}`)
			.send({
				...blogToUpdate,
				categories: []
			})
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
			.put(`/api/blogs/${blogToUpdate.id}`)
			.send({ ...blogToUpdate, private: !blogToUpdate.private })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		expect(blogsAtEnd[0].private).toBeFalsy();
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Blog Tests: Close the server');
});