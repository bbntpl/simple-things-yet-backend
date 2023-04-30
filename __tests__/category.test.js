const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const Category = require('../models/category');
const Blog = require('../models/blog');
const {
	deleteDbsForBlogTests,
	populateBlogsDb,
	populateCategoriesDb,
	blogsInDb,
	authorsInDb,
	viewersInDb,
	categoriesInDb,
	loginAuthor
} = require('../utils/testHelpers');
const { sampleAuthor1, sampleCategory1, sampleCategory2 } = require('../utils/testDataset');
const { MONGODB_URI } = require('../utils/config');

let token;
let server;

const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
})

beforeEach(async () => {
	await Category.deleteMany({});
	await deleteDbsForBlogTests();

	// populate test database
	await populateCategoriesDb();
	await populateBlogsDb();

	token = null;
	token = await loginAuthor(request, sampleAuthor1);
})

describe('initial database', () => {
	test('should connect to the test database', async () => {
		expect(mongoose.connection.readyState).toBe(1);
		expect(mongoose.connection._connectionString).toBe(MONGODB_URI);
	});
	test('should add the initial data', async () => {
		const blogs = await blogsInDb();
		const authors = await authorsInDb();
		const viewers = await viewersInDb();
		const categories = await categoriesInDb();
		expect(blogs.length).toBe(1);
		expect(authors.length).toBe(1);
		expect(viewers.length).toBe(1);
		expect(categories.length).toBe(2);
	});
})

describe('category fetch', () => {
	test('should successfully get all categories', async () => {
		const response = await request.get('/api/categories')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const categories = response.body;
		expect(categories).toHaveLength(2);
		expect(categories).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: sampleCategory1.name,
					description: sampleCategory1.description,
				}),
				expect.objectContaining({
					name: sampleCategory2.name,
					description: sampleCategory2.description,
				}),
			]),
		);
	});
	test('should successfully get a specific category by ID', async () => {
		const firstCategory = await Category.findOne({});

		const response = await request.get(`/api/categories/${firstCategory._id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);
		const fetchedCategory = response.body;

		expect(fetchedCategory).toMatchObject({
			name: sampleCategory1.name,
			description: sampleCategory1.description,
		});
	});
})

describe('creation of category', () => {
	test('should successfully create a category', async () => {
		const newCategory = {
			name: 'New Category',
			description: 'A new category for testing purposes',
		};

		await request
			.post('/api/categories')
			.send(newCategory)
			.set('Authorization', `Bearer ${token}`)
			.expect(201);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(3);
		const categoryNames = categoriesAtEnd.map(c => c.name);
		expect(categoryNames).toContain(newCategory.name);
	});

	test('should fail to create a category if it already exists', async () => {
		const duplicateCategory = {
			name: sampleCategory1.name,
			description: 'A duplicate category for testing purposes',
		};

		await request
			.post('/api/categories')
			.send(duplicateCategory)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(2);
	});
});

describe('deletion of category', () => {
	test('should successfully delete a category', async () => {
		const categoriesAtStart = await categoriesInDb();
		const categoryToDelete = categoriesAtStart[0];

		await Blog.findOneAndDelete({});

		await request
			.delete(`/api/categories/${categoryToDelete.id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(204);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(categoriesAtStart.length - 1);
		expect(categoriesAtEnd).not.toContainEqual(categoryToDelete);
	});

	test('should successfully delete a category only if there are no associated blogs', async () => {
		const categoriesAtStart = await categoriesInDb();
		const category = await Category.findById(categoriesAtStart[0].id);
		const blog = await Blog.findOne({});

		blog.categories.push(category._id);
		await blog.save();

		category.blogs.push(blog._id);
		await category.save();

		await request
			.delete(`/api/categories/${category._id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(categoriesAtStart.length);
	});
});

describe('update of category', () => {
	test('should successfully update category contents', async () => {
		const categoriesAtStart = await categoriesInDb();
		const categoryToUpdate = categoriesAtStart[0];
		const updatedCategory = {
			blogs: categoryToUpdate.blogs,
			name: 'Updated Category Name',
			description: 'Updated Category Description',
		};

		await request
			.put(`/api/categories/${categoryToUpdate.id}`)
			.send(updatedCategory)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(categoriesAtStart.length);

		const updatedCategoryFromDb = categoriesAtEnd.find(cat => cat.id === categoryToUpdate.id);
		expect(updatedCategoryFromDb).toMatchObject(updatedCategory);
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Category Tests: Close the server');
});