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
const { describe } = require('yargs');

let server;
let token;

const request = supertest(app);


beforeAll(async () => {
	server = await initApp();
});

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
		const comments = await commentsInDb();
		expect(blogs.length).toBe(1);
		expect(authors.length).toBe(1);
		expect(viewers.length).toBe(1);
		expect(comments.length).toBe(1);
	});
});

describe('fetch of comments', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
	});
	test('should get all of the comments', async () => {
		const response = await request.get('/api/comments/')
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const comments = response.body;
		expect(comments).toHaveLength(1);
	});
	test('should get a specific comment', async () => {
		const comments = await commentsInDb();
		const response = await request.get(`/api/comments/${comments[0].id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);

		const comment = response.body;
		expect(comment).toMatchObject(comments[0]);
	});
});

describe('creation of comment', () => {
	test('should fail to comment if no user is authenticated', async () => {
		const response = await request
			.post('/api/comment')
			.send({ /* comment data */ })
			.expect(401);

		expect(response.body.error).toBe('Not authenticated');
	});

	test('should successfully comment on a blog as a viewer', async () => {
		const viewerToken = await loginViewer(request, sampleViewer1);

		const response = await request
			.post('/api/comment')
			.set('Authorization', `Bearer ${viewerToken}`)
			.send({ /* comment data */ })
			.expect(201);

		expect(response.body).toMatchObject({ /* expected comment data */ });
	});

	test('should successfully add comment reference to viewer', async () => {
		const viewerToken = await loginViewer(request, sampleViewer1);

		const response = await request
			.post('/api/comment')
			.set('Authorization', `Bearer ${viewerToken}`)
			.send({ /* comment data */ })
			.expect(201);

		const updatedViewer = await Viewer.findById(sampleViewer1.id);
		expect(updatedViewer.comments).toContainEqual(response.body.id);
	});
});

describe('updating comments', () => {
	test('should fail to update a comment if no user is authenticated', async () => {
		const comments = await commentsInDb();
		const response = await request
			.put(`/api/comment/${comments[0].id}`)
			.send({ /* updated comment data */ })
			.expect(401);

		expect(response.body.error).toBe('Not authenticated');
	});

	test('should successfully update a comment as a viewer', async () => {
		const viewerToken = await loginViewer(request, sampleViewer1);
		const comments = await commentsInDb();

		const response = await request
			.put(`/api/comment/${comments[0].id}`)
			.set('Authorization', `Bearer ${viewerToken}`)
			.send({ /* updated comment data */ })
			.expect(200);

		expect(response.body).toMatchObject({ /* expected updated comment data */ });
	});
});

describe('deleting comments', () => {
	test('should fail to delete a comment if no user is authenticated', async () => {
		const comments = await commentsInDb();
		const response = await request
			.delete(`/api/comment/${comments[0].id}`)
			.expect(401);

		expect(response.body.error).toBe('Not authenticated');
	});

	test('should successfully delete a comment as a viewer', async () => {
		const viewerToken = await loginViewer(request, sampleViewer1);
		const comments = await commentsInDb();

		await request
			.delete(`/api/comment/${comments[0].id}`)
			.set('Authorization', `Bearer ${viewerToken}`)
			.expect(204);

		const updatedComments = await commentsInDb();
		expect(updatedComments).toHaveLength(0);
	});
});

describe('liking and unliking comments', () => {
	test('should fail to like a comment if the user is not authenticated', async () => {
		const comments = await commentsInDb();
		const commentToLike = comments[0];

		await request
			.put(`/api/comments/${commentToLike.id}/like`)
			.expect(401);

		const updatedComment = await Comment.findById(commentToLike.id);
		expect(updatedComment.likes).toHaveLength(0);
	});

	test('should successfully like and unlike a comment as a viewer', async () => {
		const comments = await commentsInDb();
		const commentToLike = comments[0];

		await request
			.put(`/api/comments/${commentToLike.id}/like`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedComment = await Comment.findById(commentToLike.id);
		expect(updatedComment.likes).toHaveLength(1);

		await request
			.put(`/api/comments/${commentToLike.id}/unlike`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const finalComment = await Comment.findById(commentToLike.id);
		expect(finalComment.likes).toHaveLength(0);
	});
});

describe('replies to comments', () => {
	test('should successfully create a reply to a comment', async () => {
		const comments = await commentsInDb();
		const parentComment = comments[0];
		const replyContent = 'This is a reply to the comment';

		const response = await request
			.post(`/api/comments/${parentComment.id}/replies`)
			.send({ content: replyContent })
			.set('Authorization', `Bearer ${token}`)
			.expect(201)
			.expect('Content-Type', /application\/json/);

		const reply = response.body;
		expect(reply.content).toBe(replyContent);

		const updatedParentComment = await Comment.findById(parentComment.id);
		expect(updatedParentComment.replies).toContainEqual(reply.id);
	});

	test('should successfully fetch replies to a specific comment', async () => {
		const comments = await commentsInDb();
		const parentComment = comments[0];

		const response = await request
			.get(`/api/comments/${parentComment.id}/replies`)
			.expect(200)
			.expect('Content-Type', /application\/json/);

		const replies = response.body;
		expect(replies).toHaveLength(parentComment.replies.length);
		replies.forEach(reply => {
			expect(parentComment.replies).toContainEqual(reply.id);
		});
	});
});

describe('author interactions with comments', () => {
	test('should successfully create a comment as an author', async () => {
		const response = await request
			.post('/api/comments/')
			.set('Authorization', `Bearer ${token}`)
			.send({ /* comment data */ })
			.expect(201);

		expect(response.body).toMatchObject({ /* expected comment data */ });
	});

	test('should successfully add comment reference to author', async () => {
		const response = await request
			.post('/api/comments/')
			.set('Authorization', `Bearer ${token}`)
			.send({ /* comment data */ })
			.expect(201);

		const updatedAuthor = await Author.findById(sampleAuthor1.id);
		expect(updatedAuthor.comments).toContainEqual(response.body.id);
	});

	test('should successfully update a comment as an author', async () => {
		const comments = await commentsInDb();
		const response = await request
			.put(`/api/comments/${comments[0].id}`)
			.set('Authorization', `Bearer ${token}`)
			.send({ /* updated comment data */ })
			.expect(200);

		expect(response.body).toMatchObject({ /* expected updated comment data */ });
	});

	test('should successfully delete a comment as an author', async () => {
		const comments = await commentsInDb();
		await request
			.delete(`/api/comments/${comments[0].id}`)
			.set('Authorization', `Bearer ${token}`)
			.expect(204);

		const updatedComments = await commentsInDb();
		expect(updatedComments).toHaveLength(0);
	});

	test('should successfully like and unlike a comment as an author', async () => {
		const comments = await commentsInDb();
		const commentToLike = comments[0];

		await request
			.put(`/api/comments/${commentToLike.id}/like`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedComment = await Comment.findById(commentToLike.id);
		expect(updatedComment.likes).toHaveLength(1);

		await request
			.put(`/api/comments/${commentToLike.id}/unlike`)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const finalComment = await Comment.findById(commentToLike.id);
		expect(finalComment.likes).toHaveLength(0);
	});

	test('should successfully create a reply to a comment as an author', async () => {
		const comments = await commentsInDb();
		const parentComment = comments[0];
		const replyContent = 'This is a reply to the comment';

		const response = await request
			.post(`/api/comments/${parentComment.id}/replies`)
			.send({ content: replyContent })
			.set('Authorization', `Bearer ${token}`)
			.expect(201)
			.expect('Content-Type', /application\/json/);

		const reply = response.body;
		expect(reply.content).toBe(replyContent);

		const updatedParentComment = await Comment.findById(parentComment.id);
		expect(updatedParentComment.replies).toContainEqual(reply.id);
	});
});


afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Comment Tests: Close the server');
});