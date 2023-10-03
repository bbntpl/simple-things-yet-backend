const supertest = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

const { app, initApp } = require('../app');
const { MONGODB_URI } = require('../utils/config');
const Author = require('../models/author');
const {
	loginAuthor
} = require('../utils/tests/helpers');

const {
	sampleAuthor1,
	sampleAuthor2,
} = require('../utils/tests/dataset');

let server;
const request = supertest(app);

const getAuthorWithHashedPassword = async (sampleAuthor) => {
	const passwordHash = await bcrypt.hash(sampleAuthor.password, 10);
	return {
		name: sampleAuthor.name,
		bio: sampleAuthor.bio,
		email: sampleAuthor.email,
		username: sampleAuthor.username,
		passwordHash
	};
};

beforeAll(async () => {
	server = await initApp();
	await Author.deleteMany({});
});

describe('Test database', () => {
	test('should connect to the test database', async () => {
		expect(mongoose.connection.readyState).toBe(1);
		expect(mongoose.connection._connectionString).toBe(MONGODB_URI);
	});
});

describe('View author', () => {
	beforeEach(async () => {
		await Author.deleteMany({});
		await new Author(await getAuthorWithHashedPassword(sampleAuthor1)).save();
	});

	test('should fetch author object', async () => {
		const response = await request
			.get('/api/author')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body).toHaveProperty('name', sampleAuthor1.name);
		expect(response.body).toHaveProperty('bio', sampleAuthor1.bio);
		expect(response.body).toHaveProperty('email', sampleAuthor1.email);
		expect(response.body).toHaveProperty('username', sampleAuthor1.username);
	});

	test('should not show passwordHash', async () => {
		const response = await request
			.get('/api/author')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body.passwordHash).not.toBeDefined();
	});

	test('should successfully get picture of author', async () => {
		// Login the author
		const token = await loginAuthor(request, sampleAuthor1);

		// Path to the image used for upload
		const filePath = path.join(__dirname, '../images/dbdiagram.png');

		const updatedAuthorResponse = await request
			.put('/api/author/update/image')
			.attach('authorImage', filePath, { filename: 'image.png' })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);
		expect(updatedAuthorResponse.body.imageId).toBeDefined();

		const author = await Author.findById(updatedAuthorResponse.body.id);
		const gfsResponse = await request
			.get(`/api/author/${author.imageId}/image`)
			.expect(200);
		expect(gfsResponse.headers['content-type']).toEqual('image/png');
	});
});

describe('Registration of author', () => {
	beforeEach(async () => {
		await Author.deleteMany({});
	});

	test('should register a new author account', async () => {
		const response = await request
			.post('/api/author/register')
			.send({
				email: sampleAuthor1.email,
				username: sampleAuthor1.username,
				password: sampleAuthor1.password
			})
			.expect('Content-Type', /application\/json/)
			.expect(201);

		const createdAuthor = await Author.findById(response.body.id);
		expect(createdAuthor.name).toBe(sampleAuthor1.username);
		expect(createdAuthor.username).toBe(sampleAuthor1.username);
		expect(createdAuthor.email).toBe(sampleAuthor1.email);
	});

	test('should only allowed to have one author', async () => {
		await new Author(await getAuthorWithHashedPassword(sampleAuthor1)).save();

		const response = await request
			.post('/api/author/register')
			.send({
				email: sampleAuthor2.email,
				username: sampleAuthor2.username,
				password: sampleAuthor1.password
			})
			.expect('Content-Type', /application\/json/)
			.expect(403);

		const createdAuthor = await Author.findById(response.body.id);
		const numOfAuthors = await Author.countDocuments({});

		expect(response.body.errors[0]).toHaveProperty('msg', 'You are only allowed to have one account');
		expect(createdAuthor).toBeNull();
		expect(numOfAuthors).toEqual(1);
	});
});

describe('Login of author', () => {
	beforeEach(async () => {
		await Author.deleteMany({});
		await new Author(await getAuthorWithHashedPassword(sampleAuthor1)).save();
	});

	test('should log in with valid credentials', async () => {
		const response = await request
			.post('/api/author/login')
			.send({
				username: sampleAuthor1.username,
				password: sampleAuthor1.password
			})
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body.token).toBeTruthy();
	});

	test('should not log in with invalid credentials', async () => {
		await request
			.post('/api/author/login')
			.send({
				username: sampleAuthor1.username,
				password: 'notthepassword'
			})
			.expect('Content-Type', /application\/json/)
			.expect(401);
	});
});

describe('Update of author', () => {
	let token;
	const newAuthorInfo = {
		name: 'B.B. Antipolo',
		bio: 'Lifelong learner forever',
		email: 'admin@gmail.com'
	};

	beforeEach(async () => {
		await Author.deleteMany({});
		await new Author(await getAuthorWithHashedPassword(sampleAuthor1)).save();

		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should successfully change name, bio and email', async () => {
		const response = await request
			.put('/api/author/update')
			.send(newAuthorInfo)
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body.name).toEqual(newAuthorInfo.name);
		expect(response.body.bio).toEqual(newAuthorInfo.bio);
		expect(response.body.email).toEqual(newAuthorInfo.email);
	});

	test('should successfully update picture of author', async () => {
		const authorResponse = await request
			.get('/api/author')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const filePath = path.join(__dirname, '../images/dbdiagram.png');

		const updatedAuthorImageResponse = await request
			.put('/api/author/update/image')
			.attach('authorImage', filePath, { filename: 'image.png' })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		expect(updatedAuthorImageResponse.body.imageId).toBeDefined();
		expect(updatedAuthorImageResponse.body.imageId).not.toEqual(authorResponse.body.imageId);
	});
});

afterAll(async () => {
	await mongoose.connection.close();
	server.close();
	console.log('Author Tests: Close the server');
});