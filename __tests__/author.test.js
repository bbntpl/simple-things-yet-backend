const supertest = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const app = require('../app');
const { MONGODB_URI } = require('../utils/config');
const Author = require('../models/author');

const request = supertest(app);

const sampleAuthor = {
	name: 'Random Author',
	bio: 'This is a random author bio.',
	email: 'first.author@example.com',
	username: 'randauthor',
	password: 'SamplePass123',
};

const getAuthorWithHashedPassword = async () => {
	const passwordHash = await bcrypt.hash(sampleAuthor.password, 10);

	return {
		name: sampleAuthor.name,
		bio: sampleAuthor.bio,
		email: sampleAuthor.email,
		username: sampleAuthor.username,
		passwordHash
	}
}

beforeAll(async () => {
	await Author.deleteMany({});
});

describe('Test database', () => {
	test('should connect to the test database', async () => {
		expect(mongoose.connection.readyState).toBe(1);
		expect(mongoose.connection._connectionString).toBe(MONGODB_URI);
	});
});

describe('View author', () => {
	let author;
	beforeEach(async () => {
		author = await new Author(await getAuthorWithHashedPassword()).save();
		await Author.deleteMany({});
	})

	test('should fetch author object', async () => {
		const response = await request
			.get('/api/author')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body).toHaveProperty(name, 'Random Author');
		expect(response.body).toHaveProperty(bio, 'This is a random author bio.');
		expect(response.body).toHaveProperty(email, 'first.author@example.com');
		expect(response.body).toHaveProperty(username, 'randauthor');
	})

	test('should only have author', async () => {
		const response = await request
			.get('/api/author')
			// .expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body).toHaveLength(1);
	})

	test('should not show passwordHash', async () => {
		const response = await request
			.get('/api/author')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body.passwordHash).not.toBeDefined();
	})
});

describe('Registration/Login of author', () => {
	beforeEach(async () => {
		await new Author(await getAuthorWithHashedPassword()).save();
		await Author.deleteMany({});
	})

	test('should register a new author account', async () => {
		const response = await request
			.post('/api/author/register')
			.send(sampleAuthor)
			.expect('Content-Type', /application\/json/)
			.expect(201);

		const createdAuthor = await Author.findById(response.body.id);
		expect(createdAuthor.name).toBe(sampleAuthor.name);
	});

	test('should log in with valid credentials', async () => {
		const response = await request
			.post('/api/author/login')
			.send({
				username: sampleAuthor.username,
				password: sampleAuthor.password
			})
			.expect('Content-Type', /application\/json/)
			.expect(200);

		expect(response.body.token).toBeTruthy();
	});

	test('should not log in with invalid credentials', async () => {
		await request
			.post('/api/author/login')
			.send({
				username: sampleAuthor.username,
				password: 'notthepassword'
			})
			.expect('Content-Type', /application\/json/)
			.expect(401);
	});
});

describe('Update of author', () => {
	let token;

	beforeEach(async () => {
		await new Author(await getAuthorWithHashedPassword()).save();
		const passwordHash = await bcrypt.hash(sampleAuthor.password, 10);
		const response = await request
			.post('/api/author/login')
			.send({
				username: sampleAuthor.username,
				passwordHash
			});

		token = response.body.token;
	});

	test('should successfuly change name and bio', async () => {
		const response = await request
			.put('/author/update')
			.send({
				name: 'B.B. Antipolo',
				bio: 'Lifelong learner forever'
			})
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /application\/json/)
			.expect(200)

		expect(response.body.name).toEqual('B.B. Antipolo');
		expect(response.body.bio).toEqual('Lifelong learner forever');
	})
})

afterAll(async () => {
	await mongoose.connection.close();
});