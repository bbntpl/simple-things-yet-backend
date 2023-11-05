const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const Tag = require('../models/tag');
const Blog = require('../models/blog');
const {
	deleteDbsForBlogTests,
	populateBlogsDb,
	populateTagsDb,
	tagsInDb,
	loginAuthor
} = require('../utils/tests/helpers');
const { sampleAuthor1, sampleTag1, sampleTag2 } = require('../utils/tests/dataset');

let token;
const server = initApp();
const request = supertest(app);

beforeEach(async () => {
	await Tag.deleteMany({});
	await deleteDbsForBlogTests();

	// populate test database
	await populateTagsDb();
	await populateBlogsDb();

	token = null;
	token = await loginAuthor(request, sampleAuthor1);
});

describe('tag fetch', () => {
	test('should successfully get all tags', async () => {
		const response = await request.get('/api/tags')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const tags = response.body;
		expect(tags).toHaveLength(2);
		expect(tags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: sampleTag1.name,
				}),
				expect.objectContaining({
					name: sampleTag2.name,
				}),
			]),
		);
	});
	test('should successfully get a specific tag by ID', async () => {
		const firstTag = await Tag.findOne({});

		const response = await request.get(`/api/tags/${firstTag._id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);
		const fetchedTag = response.body;

		expect(fetchedTag).toMatchObject({
			name: sampleTag1.name,
		});
	});
});

describe('creation of tag', () => {
	test('should successfully create a tag', async () => {
		const newTag = {
			name: 'New Tag',
		};

		await request
			.post('/api/tags')
			.send(newTag)
			.set('Authorization', `Bearer ${token}`)
			.expect(201);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(3);
		const tagNames = tagsAtEnd.map(c => c.name);
		expect(tagNames).toContain(newTag.name.toLowerCase());
	});

	test('should fail to create a tag if it already exists', async () => {
		const duplicateTag = {
			name: sampleTag1.name,
		};

		await request
			.post('/api/tags')
			.send(duplicateTag)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(2);
	});
	test('should fail to create a tag if there is no given name', async () => {
		const duplicateTag = {
			description: 'A duplicate tag for testing purposes',
		};
		await request
			.post('/api/tags')
			.send(duplicateTag)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(2);
	});
});

describe('deletion of tag', () => {
	test('should successfully delete a tag', async () => {
		const tagsAtStart = await tagsInDb();
		const tagToDelete = tagsAtStart[0];

		await Blog.findOneAndDelete({});

		await request
			.delete(`/api/tags/${tagToDelete.id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(204);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(tagsAtStart.length - 1);
		expect(tagsAtEnd).not.toContainEqual(tagToDelete);
	});

	test('should successfully delete a tag only if there are no associated blogs', async () => {
		const tagsAtStart = await tagsInDb();
		const tag = await Tag.findById(tagsAtStart[0].id);
		const blog = await Blog.findOne({});

		blog.tags.push(tag._id);
		await blog.save();

		tag.blogs.push(blog._id);
		await tag.save();

		await request
			.delete(`/api/tags/${tag._id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(tagsAtStart.length);
	});
});

describe('update of tag', () => {
	test('should successfully update tag contents', async () => {
		const tagsAtStart = await tagsInDb();
		const tagToUpdate = tagsAtStart[0];
		const updatedTag = {
			blogs: tagToUpdate.blogs,
			name: 'updated tag name',
			id: tagToUpdate.id
		};

		await request
			.put(`/api/tags/${tagToUpdate.id}`)
			.send(updatedTag)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const tagsAtEnd = await tagsInDb();
		expect(tagsAtEnd).toHaveLength(tagsAtStart.length);

		const updatedTagFromDb = tagsAtEnd.find(cat => cat.id === tagToUpdate.id);
		expect(updatedTagFromDb).toMatchObject(updatedTag);
	});
});

afterAll(() => {
	server.close();
	mongoose.connection.close();
	console.log('Tag Tests: Close the server');
});