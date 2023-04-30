const mongoose = require('mongoose');
const supertest = require('supertest');

const { MONGODB_URI } = require('../utils/config');
const { sampleViewer1, sampleViewer2 } = require('../utils/testDataset');
const { viewersInDb } = require('../utils/testHelpers');
const { describe } = require('yargs');

let token;
let server;

const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
})

beforeEach(async () => {
	await deleteDbsForBlogTests();

	// populate test database
	await populateBlogsDb();

	token = null;
	token = await loginViewer(request, sampleViewer1);
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
		expect(blogs.length).toBe(1);
		expect(authors.length).toBe(1);
		expect(viewers.length).toBe(1);
	});
})

describe('fetch viewer object', () => {
	test('should successfully fetch all viewers', async () => {
		const viewers = await viewersInDb();

		const response = await request.
			get('/api/viewer/all')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const fetchedViewers = response.body;
		expect(fetchedViewers).toHaveLength(viewers.length);
	})
	test('should successfully fetch a specific viewer', async () => {
		const viewers = await viewersInDb();
		const response = await request.
			get(`/api/viewer/${viewers[0].id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const fetchedViewer = response.body;
		expect(fetchedViewer.name).toEqual(viewers[0].name);
		expect(fetchedViewer.username).toEqual(viewers[0].username);
		expect(fetchedViewer.comments).toHaveLength(0);
	})
	test('should successfully fetch a specific viewer excluding passwordHash', async () => {
		const viewers = await viewersInDb();
		const response = await request.
			get(`/api/viewer/${viewers[0].id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const fetchedViewer = response.body;
		expect(fetchedViewer.passwordHash).not.toBeDefined();
	})
})

describe('registration of viewer', () => {
	test('should succesfully register a user/viewer', async () => {
		const response = await request.post('api/viewer/register')
		send(sampleViewer2)
			.expect('Content-Type', /application\/json/)
			.expect(201);
	})
})

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Viewer Tests: Close the server');
});