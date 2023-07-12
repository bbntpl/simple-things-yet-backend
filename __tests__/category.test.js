const supertest = require('supertest');
const mongoose = require('mongoose');
const path = require('path');

const { app, initApp } = require('../app');
const Category = require('../models/category');
const Blog = require('../models/blog');
const {
	deleteDbsForBlogTests,
	populateBlogsDb,
	populateCategoriesDb,
	categoriesInDb,
	loginAuthor
} = require('../utils/testHelpers');
const { sampleAuthor1, sampleCategory1, sampleCategory2 } = require('../utils/testDataset');

let token;
let server;

const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
});

beforeEach(async () => {
	await Category.deleteMany({});
	await deleteDbsForBlogTests();

	// populate test database
	await populateCategoriesDb();
	await populateBlogsDb();

	token = null;
	token = await loginAuthor(request, sampleAuthor1);
});

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
});

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

	test('should successfully create a category with an image', async () => {
		const newCategory = {
			name: 'New Category',
			description: 'A new category for testing purposes',
		};

		// path to the image used for upload
		const filePath = path.join(__dirname, '../images/dbdiagram.png');

		await request
			.post('/api/categories')
			.field('name', newCategory.name)
			.field('description', newCategory.description)
			.attach('categoryImage', filePath, 'image.jpg')
			.set('Authorization', `Bearer ${token}`)
			.expect(201);

		const categoriesAtEnd = await categoriesInDb();
		expect(categoriesAtEnd).toHaveLength(3);
		const categoryNames = categoriesAtEnd.map(c => c.name);
		expect(categoryNames).toContain(newCategory.name);

		console.log(categoriesAtEnd);
		// check if image is saved
		expect(mongoose.Types.ObjectId.isValid(categoriesAtEnd[2].imageId)).toBeTruthy();

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
	test('should fail to create a category if there is no given name', async () => {
		const duplicateCategory = {
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

		blog.category = (category._id);
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
			name: 'updated category name',
			description: 'Updated Category Description',
			id: categoryToUpdate.id
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