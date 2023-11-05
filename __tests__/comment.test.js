const supertest = require('supertest');
const mongoose = require('mongoose');

const { app, initApp } = require('../app');
const {
	deleteDbsForBlogTests,
	loginAuthor,
	populateBlogsDb,
	commentsInDb,
	loginViewer,
	createInitialViewer,
	clearDb,
} = require('../utils/tests/helpers');
const {
	sampleAuthor1,
	sampleViewer1,
	sampleViewer2
} = require('../utils/tests/dataset');
const Viewer = require('../models/viewer');
const Comment = require('../models/comment');
const Author = require('../models/author');
const Blog = require('../models/blog');

let token;
const server = initApp();
const request = supertest(app);

beforeAll(async () => {
	await clearDb();
});

describe('fetch of comments', () => {
	describe('that are children; replies', () => {
		beforeEach(async () => {
			await deleteDbsForBlogTests({ deleteCommentCollection: true });
			await populateBlogsDb({ allowComment: true, allowReply: true });
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
				expect(parentComment.replies.toString()).toEqual(reply.toString());
			});
		});

		test('should successfully fetch a specific reply to a comment', async () => {
			const parentComment = await Comment.findOne({}).populate(['viewer', 'author']);
			const reply = await Comment.findById(parentComment.replies[0]);

			const response = await request
				.get(`/api/comments/${reply._id}`)
				.expect(200)
				.expect('Content-Type', /application\/json/);

			const requestedReply = response.body;
			expect(requestedReply.id.toString()).toEqual(reply._id.toString());
		});
	});

	describe('that are parents; parentComments', () => {
		beforeEach(async () => {
			await deleteDbsForBlogTests({ deleteCommentCollection: true });
			await populateBlogsDb({ allowComment: true });
		});

		test('should fetch all of the comments', async () => {
			const response = await request.get('/api/comments/')
				.expect('Content-Type', /application\/json/)
				.expect(200);

			const comments = response.body;
			expect(comments).toHaveLength(1);
		});

		test('should fetch a specific comment', async () => {
			const comments = await Comment.find({}).populate(['viewer', 'author']);
			const response = await request.get(`/api/comments/${comments[0].id}`)
				.expect('Content-Type', /application\/json/)
				.expect(200);

			const comment = response.body;
			expect(comment.id.toString()).toEqual(comments[0]._id.toString());
		});
	});
});

/**
 * Tests the comment creation process for the given user type, user, token, blog, model, comment route, and parent comment.
 *
 * @param {Object} params - The parameters for the test.
 * @param {string} params.userType - The type of user (author or viewer).
 * @param {Object} params.user - The user object.
 * @param {string} params.token - The user's authentication token.
 * @param {Object} params.blog - The blog object.
 * @param {Object} params.UserModel - The user model (Author or Viewer).
 * @param {string} params.commentRoute - The API route for creating the comment.
 * @param {mongoose.Types.ObjectId} [params.parentComment=null] - The parent comment id, if applicable.
 */

const testCommentCreation = async ({ userType, user, token, blog, UserModel, commentRoute, parentComment = null }) => {
	const response = await request
		.post(commentRoute)
		.send({
			content: 'I like this blog post!',
			user: user._id,
			blog: blog._id,
			...(parentComment !== null ? { parentComment: parentComment._id } : {})
		})
		.set('Authorization', `Bearer ${token}`)
		.expect(201);

	const createdComment = response.body;

	expect(createdComment.content).toEqual('I like this blog post!');
	expect(createdComment[userType].toString()).toEqual(user._id.toString());
	expect(createdComment.blog.toString()).toEqual(blog._id.toString());

	if (parentComment !== null && parentComment) {
		// Verify that the reply reference is added to the parentComment replies
		const updatedParentComment = await Comment.findById(parentComment._id);
		expect(updatedParentComment.replies.map(String)).toContainEqual(response.body.id.toString());
	}

	// Verify that the comment/reply reference is added to the user comments
	const updatedUser = await UserModel.findById(user._id);
	expect(updatedUser.comments.map(String)).toContainEqual(response.body.id.toString());

	// Verify that the comment/reply reference is added to the blog comments
	const updatedBlog = await Blog.findById(blog._id);
	expect(updatedBlog.comments.map(String)).toContainEqual(response.body.id.toString());
};

describe('creation of a comment', () => {
	let blog;
	let user;
	test('should fail to comment if no user is authenticated', async () => {
		const response = await request
			.post('/api/comments')
			.send({})
			.expect(401);

		expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
	});

	describe('that is a parentComment', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests();
				await populateBlogsDb();
				token = await loginAuthor(request, sampleAuthor1);

				blog = await Blog.findOne({});
				user = await Author.findOne({});
			});

			test('should successfully comment on a blog as an author', async () => {
				await testCommentCreation({
					userType: 'author',
					user,
					token,
					blog,
					UserModel: Author,
					commentRoute: '/api/comments/author-only'
				});
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests();
				await populateBlogsDb();
				token = await loginViewer(request, sampleViewer1);

				blog = await Blog.findOne({});
				user = await Viewer.findOne({});
			});

			test('should successfully comment on a blog as a viewer', async () => {
				await testCommentCreation({
					userType: 'viewer',
					user,
					token,
					blog,
					UserModel: Viewer,
					commentRoute: '/api/comments/'
				});
			});
		});
	});

	describe('that is a reply', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests();
				await populateBlogsDb();
				token = await loginAuthor(request, sampleAuthor1);

				blog = await Blog.findOne({});
				user = await Author.findOne({});
			});

			test('should successfully reply on a comment as an author', async () => {
				const initialComment = await Comment.findOne({});

				await testCommentCreation({
					userType: 'author',
					user,
					token,
					blog,
					UserModel: Author,
					commentRoute: `/api/comments/${initialComment._id}/replies/author-only`,
					parentComment: initialComment._id
				});
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests();
				await populateBlogsDb();
				token = await loginViewer(request, sampleViewer1);

				blog = await Blog.findOne({});
				user = await Viewer.findOne({});
			});

			test('should successfully reply on a comment as a viewer', async () => {
				const initialComment = await Comment.findOne({});

				await testCommentCreation({
					userType: 'viewer',
					user,
					token,
					blog,
					UserModel: Viewer,
					commentRoute: `/api/comments/${initialComment._id}/replies`,
					parentComment: initialComment._id
				});
			});
		});
	});
});

describe('update of a comment', () => {
	let user;
	describe('by an unauthorized user', () => {
		beforeEach(async () => {
			await deleteDbsForBlogTests({ deleteCommentCollection: true });
			await populateBlogsDb({
				allowComment: true,
				allowReply: true,
				viewerIsCommenter: false
			});

			token = await loginAuthor(request, sampleAuthor1);
			user = await Author.findOne({});
		});

		test('should fail to update a reply', async () => {
			const parentComment = await Comment.findOne({ parentComment: null });
			const userReply = await Comment.findOne({ parentComment: parentComment._id });

			const response = await request
				.put(`/api/comments/${parentComment._id}/replies/${userReply._id}`)
				.send({
					...userReply,
					content: 'What do you think of the blog?'
				})
				.expect(401);

			expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
		});

		test('should fail to update a comment', async () => {
			const parentComment = await Comment.findOne({ parentComment: null });

			const response = await request
				.put(`/api/comments/${parentComment._id}`)
				.send({
					...parentComment,
					content: 'I lied, your content is lacking somethng'
				})
				.expect(401);

			expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
		});
	});

	describe('that is a parentComment', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, viewerIsCommenter: false });

				token = await loginAuthor(request, sampleAuthor1);
				user = await Author.findOne({});
			});

			test('should successfully update a comment as an author', async () => {
				const comments = await commentsInDb();
				const userComment = comments.find(comment => comment.author.toString() === user._id.toString());

				const response = await request
					.put(`/api/comments/${userComment.id}/author-only`)
					.send({
						...userComment,
						content: 'I lied, your content is lacking something'
					})
					.set('Authorization', `Bearer ${token}`)
					.expect(200);

				const updatedComment = response.body;
				expect(updatedComment.content).toEqual('I lied, your content is lacking something');
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true });

				token = await loginViewer(request, sampleViewer1);
				user = await Viewer.findOne({});
			});

			test('should successfully update a comment as a viewer', async () => {
				const comments = await commentsInDb();
				const userComment = comments.find(comment => comment.viewer.toString() === user._id.toString());

				const response = await request
					.put(`/api/comments/${userComment.id}`)
					.send({
						...userComment,
						content: 'I lied, your content is lacking something'
					})
					.set('Authorization', `Bearer ${token}`)
					.expect(200);

				const updatedComment = response.body;
				expect(updatedComment.content).toEqual('I lied, your content is lacking something');
			});
		});
	});

	describe('that is a reply', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, viewerIsCommenter: false, allowReply: true });

				token = await loginAuthor(request, sampleAuthor1);
				user = await Author.findOne({});
			});

			test('should successfully update a reply as an author', async () => {
				const parentComment = await Comment.findOne({ parentComment: null });
				const userReply = await Comment.findOne({ parentComment: parentComment._id });

				const response = await request
					.put(`/api/comments/${parentComment._id}/replies/${userReply._id}/author-only/`)
					.send({
						...userReply.toObject(),
						content: 'I lied, your content is lacking something'
					})
					.set('Authorization', `Bearer ${token}`)
					.expect(200);

				const updatedReply = response.body;
				expect(updatedReply.content).toEqual('I lied, your content is lacking something');
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, allowReply: true });

				token = await loginViewer(request, sampleViewer1);
				user = await Viewer.findOne({});
			});

			test('should successfully update a reply as a viewer', async () => {
				const parentComment = await Comment.findOne({ parentComment: null });
				const userReply = await Comment.findOne({ parentComment: parentComment._id });

				const response = await request
					.put(`/api/comments/${parentComment._id}/replies/${userReply._id}`)
					.set('Authorization', `Bearer ${token}`)
					.send({
						...userReply.toObject(),
						content: 'I lied, your content is lacking something'
					})
					.expect(200);

				const updatedReply = response.body;
				expect(updatedReply.content).toEqual('I lied, your content is lacking something');
			});
		});
	});
});

describe('deletion of a comment', () => {
	describe('by an unauthorized user', () => {
		beforeEach(async () => {
			await deleteDbsForBlogTests({ deleteCommentCollection: true });
			await populateBlogsDb({ allowComment: true, allowReply: true, viewerIsCommenter: false });
			token = await loginAuthor(request, sampleAuthor1);
		});

		test('should fail to delete a comment', async () => {
			const comments = await commentsInDb();

			const response = await request
				.delete(`/api/comments/${comments[0].id}`)
				.expect(401);

			expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
		});

		test('should fail to delete a reply', async () => {
			const parentComment = await Comment.findOne({ parentComment: null });
			const userReply = await Comment.findOne({ parentComment: parentComment._id });

			const response = await request
				.delete(`/api/comments/${parentComment._id}/replies/${userReply._id}`)
				.expect(401);

			expect(response.body.error).toBe('Unauthorized: Missing Authorization header.');
		});
	});

	describe('that is a parent comment', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, viewerIsCommenter: false });
				token = await loginAuthor(request, sampleAuthor1);
			});

			test('should successfully delete a comment as an author', async () => {
				const initialComment = await Comment.findOne({});

				await request
					.delete(`/api/comments/${initialComment._id}/author-only`)
					.set('Authorization', `Bearer ${token}`)
					.expect(204);

				const updatedComments = await commentsInDb();
				expect(updatedComments).toHaveLength(0);
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true });
				token = await loginViewer(request, sampleViewer1);
			});

			test('should successfully delete a comment as a viewer', async () => {
				const initialComment = await Comment.findOne({});

				await request
					.delete(`/api/comments/${initialComment._id}`)
					.set('Authorization', `Bearer ${token}`)
					.expect(204);

				const updatedComments = await commentsInDb();
				expect(updatedComments).toHaveLength(0);
			});
		});
	});

	describe('that is a reply', () => {
		describe('by an author', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, allowReply: true, viewerIsCommenter: false });
				token = await loginAuthor(request, sampleAuthor1);

			});

			test('should successfully delete a reply as an author', async () => {
				const comments = await commentsInDb();
				const commentWithReplies = comments.find(comment => comment.replies.length > 0);
				const replyId = commentWithReplies.replies[0];

				await request
					.delete(`/api/comments/${commentWithReplies.id}/replies/${replyId}/author-only`)
					.set('Authorization', `Bearer ${token}`)
					.expect(204);

				const updatedComments = await commentsInDb();
				const deletedReply = updatedComments.find(comment => comment.id.toString() === replyId.toString());
				expect(deletedReply).toBeUndefined();
				expect(updatedComments).toHaveLength(1);
			});
		});

		describe('by a viewer', () => {
			beforeEach(async () => {
				await deleteDbsForBlogTests({ deleteCommentCollection: true });
				await populateBlogsDb({ allowComment: true, allowReply: true });
				token = await loginViewer(request, sampleViewer1);
			});

			test('should successfully delete a reply as a viewer', async () => {
				const comments = await commentsInDb();
				const commentWithReplies = comments.find(comment => comment.replies.length > 0);
				const replyId = commentWithReplies.replies[0];

				await request
					.delete(`/api/comments/${commentWithReplies.id}/replies/${replyId}`)
					.set('Authorization', `Bearer ${token}`)
					.expect(204);

				const updatedComments = await commentsInDb();
				const deletedReply = updatedComments.find(comment => comment.id.toString() === replyId.toString);
				expect(deletedReply).toBeUndefined();
				expect(updatedComments).toHaveLength(1);
			});
		});
	});
});

describe('liking and unliking', () => {
	let secondUser;
	describe('by an unauthenticated user', () => {
		beforeEach(async () => {
			await deleteDbsForBlogTests({ deleteCommentCollection: true });
			await populateBlogsDb({ allowComment: true, allowReply: true });

			secondUser = await createInitialViewer(sampleViewer2);
			token = await loginViewer(request, sampleViewer2);
		});

		describe('on a parentComment', () => {
			test('should fail to like a comment if the user is not authenticated', async () => {
				const comments = await commentsInDb();
				const commentToLike = comments[0];

				const response = await request
					.put(`/api/comments/${commentToLike.id}`)
					.send({
						...commentToLike,
						likes: [
							...commentToLike.likes,
							secondUser._id
						]
					})
					.expect(401);

				const updatedComment = await Comment.findById(commentToLike.id);
				expect(updatedComment.likes).toHaveLength(0);
				expect(response.body.error).toEqual('Unauthorized: Missing Authorization header.');
			});
		});

		describe('on a reply', () => {
			test('should fail to like a reply if the user is not authenticated', async () => {
				const comments = await commentsInDb();
				const parentComment = comments.find(comment => comment.replies.length > 0);
				const replyToLike = await Comment.findById(parentComment.replies[0]);

				const response = await request
					.put(`/api/comments/${parentComment.id}/replies/${replyToLike.id}`)
					.send({
						...replyToLike,
						likes: [
							...replyToLike.likes,
							secondUser._id
						]
					})
					.expect(401);

				const updatedReply = await Comment.findById(replyToLike.id);
				expect(updatedReply.likes).toHaveLength(0);
				expect(response.body.error).toEqual('Unauthorized: Missing Authorization header.');
			});
		});
	});
	describe('on a parent comment', () => {
		const testCases = [
			{
				description: 'by a viewer',
				setup: async () => {
					await deleteDbsForBlogTests({ deleteCommentCollection: true });
					await populateBlogsDb({ allowComment: true });

					secondUser = await createInitialViewer(sampleViewer2);
					token = await loginViewer(request, sampleViewer2);
				},
				pathSegment: ''
			},
			{
				description: 'by an author',
				setup: async () => {
					await deleteDbsForBlogTests({ deleteCommentCollection: true });
					await populateBlogsDb({ allowComment: true });

					secondUser = await Author.findOne({});
					token = await loginAuthor(request, sampleAuthor1);
				},
				pathSegment: '/author-only'
			}
		];

		testCases.forEach(({ description, setup, pathSegment }) => {
			describe(description, () => {
				beforeEach(setup);

				test('should successfully like and unlike a comment', async () => {
					const comments = await commentsInDb();
					const commentToLike = comments[0];

					await request
						.put(`/api/comments/${commentToLike.id}${pathSegment}`)
						.send({
							...commentToLike,
							likes: [
								...commentToLike.likes,
								secondUser._id
							]
						})
						.set('Authorization', `Bearer ${token}`)
						.expect(200);

					const commentAfterLike = await Comment.findById(commentToLike.id);
					expect(commentAfterLike.likes.map(String)).toContain(secondUser._id.toString());
					expect(commentAfterLike.likes).toHaveLength(1);

					await request
						.put(`/api/comments/${commentToLike.id}${pathSegment}`)
						.send({
							...commentAfterLike.toObject(),
							likes: []
						})
						.set('Authorization', `Bearer ${token}`)
						.expect(200);

					const commentAfterUnlike = await Comment.findById(commentToLike.id);
					expect(commentAfterUnlike.likes.map(String)).not.toContain(secondUser._id.toString());
					expect(commentAfterUnlike.likes).toHaveLength(0);
				});
			});
		});
	});

	describe('on a reply', () => {
		const testCases = [
			{
				description: 'by a viewer',
				setup: async () => {
					await deleteDbsForBlogTests({ deleteCommentCollection: true });
					await populateBlogsDb({ allowComment: true, allowReply: true });

					secondUser = await createInitialViewer(sampleViewer2);
					token = await loginViewer(request, sampleViewer2);
				},
				pathSegment: ''
			},
			{
				description: 'by an author',
				setup: async () => {
					await deleteDbsForBlogTests({ deleteCommentCollection: true });
					await populateBlogsDb({ allowComment: true, allowReply: true });

					secondUser = await Author.findOne({});
					token = await loginAuthor(request, sampleAuthor1);
				},
				pathSegment: '/author-only'
			}
		];

		testCases.forEach(({ description, setup, pathSegment }) => {
			describe(description, () => {
				beforeEach(setup);
				test('should successfully like and unlike a reply', async () => {
					const comments = await commentsInDb();
					const parentComment = comments.find(comment => comment.replies.length > 0);
					const replyToLike = await Comment.findById(parentComment.replies[0]);

					await request
						.put(`/api/comments/${parentComment.id}/replies/${replyToLike.id}${pathSegment}`)
						.send({
							...replyToLike.toObject(),
							likes: [
								...replyToLike.likes,
								secondUser._id
							]
						})
						.set('Authorization', `Bearer ${token}`)
						.expect(200);

					const replyAfterLike = await Comment.findById(replyToLike.id);
					expect(replyAfterLike.likes.map(String)).toContain(secondUser._id.toString());
					expect(replyAfterLike.likes).toHaveLength(1);

					await request
						.put(`/api/comments/${parentComment.id}/replies/${replyToLike.id}${pathSegment}`)
						.send({
							...replyToLike,
							likes: []
						})
						.set('Authorization', `Bearer ${token}`)
						.expect(200);

					const replyAfterUnlike = await Comment.findById(replyToLike.id);
					expect(replyAfterUnlike.likes.map(String)).not.toContain(secondUser._id.toString());
					expect(replyAfterUnlike.likes).toHaveLength(0);
				});
			});
		});
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Comment Tests: Close the server');
});