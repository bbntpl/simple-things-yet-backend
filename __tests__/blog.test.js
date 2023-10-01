const supertest = require('supertest');
const mongoose = require('mongoose');
const path = require('path');

const { app, initApp } = require('../app');
const {
	deleteDbsForBlogTests,
	loginAuthor,
	populateBlogsDb,
	blogsInDb,
	authorsInDb,
	commentsInDb,
	loginViewer,
} = require('../utils/testHelpers');
const {
	sampleAuthor1,
	sampleBlog2,
	sampleBlog1,
	sampleTag1,
	sampleViewer1,
	sampleCategory2
} = require('../utils/testDataset');
const Tag = require('../models/tag');
const Blog = require('../models/blog');
const Viewer = require('../models/viewer');
const Category = require('../models/category');

let server;
let token;

const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
});

const postBlog = async (blog, token, publishAction) => {
	if (!['save', 'publish'].includes(publishAction)) {
		throw new Error('Invalid postType');
	}

	const filePath = path.join(__dirname, '../images/dbdiagram.png');
	return await request
		.post(`/api/blogs/${publishAction}`)
		.field('title', blog.title)
		.field('content', blog.content)
		.attach('blogImage', filePath, 'image.png')
		.set('Authorization', `Bearer ${token}`)
		.expect('Content-Type', /application\/json/)
		.expect(201);
};

const saveBlog = (blog, token) => postBlog(blog, token, 'save');
const publishBlog = (blog, token) => postBlog(blog, token, 'publish');

const getBlogs = async () => {
	return await request.get('/api/blogs')
		.expect('Content-Type', /application\/json/)
		.expect(200);
};

const getBlog = async (blogId) => {
	return await request
		.get(`/api/blogs/${blogId}`)
		.expect('Content-Type', /application\/json/)
		.expect(200);
};

describe('fetching blogs', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should return blogs as json', async () => {
		const blogs = await getBlogs();
		const initialBlog = blogs.body[0];

		expect(initialBlog.content).toEqual(sampleBlog1.content);
		expect(initialBlog.title).toEqual(sampleBlog1.title);
		expect(initialBlog.isPrivate).toBeTruthy();
	});

	test('should return specific blog', async () => {
		const blog = (await blogsInDb())[0];
		const fetchedBlog = await getBlog(blog.id);

		const initialBlog = fetchedBlog.body;
		expect(initialBlog.content).toEqual(blog.content);
		expect(initialBlog.title).toEqual(blog.title);
		expect(initialBlog.isPrivate).toBeTruthy();
	});

	test('should be associated to the initial author', async () => {
		const blog = (await blogsInDb())[0];
		const author = (await authorsInDb())[0];

		const fetchedBlog = await getBlog(blog.id);
		const initialBlog = fetchedBlog.body;
		expect(initialBlog.author.name).toEqual(author.name);
		expect(initialBlog.author.bio).toEqual(author.bio);
	});

	test('should successfully get blog preview image', async () => {
		const newBlog = {
			title: 'new blog with preview image',
			content: 'test purposes',
		};

		const savedBlogResponse = await saveBlog(newBlog, token);
		expect(savedBlogResponse.body.imageId).toBeDefined();

		const latestBlog = await Blog.findById(savedBlogResponse.body.id);

		const gfsResponse = await request
			.get(`/api/blogs/${latestBlog.imageId}/image`)
			.expect(200);

		expect(gfsResponse.headers['content-type']).toEqual('image/png');
	});
});

describe('creation of blog', () => {
	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();

		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should publish a valid blog', async () => {
		await publishBlog(sampleBlog2, token);
		const response = await getBlogs();

		const blogs = response.body;
		const blogToValidate = blogs.find(blog => {
			return blog.title === sampleBlog2.title
				&& blog.content === sampleBlog2.content;
		});

		expect(blogToValidate).toBeTruthy();
		expect(blogToValidate.isPublished).toBeTruthy();
		expect(blogs).toHaveLength(2);
	});

	test('should save a blog as a draft (not published)', async () => {
		await saveBlog(sampleBlog2, token);
		const response = await getBlogs();

		const blogs = response.body;
		const blogToValidate = blogs.find(blog => {
			return blog.title === sampleBlog2.title
				&& blog.content === sampleBlog2.content;
		});

		expect(blogToValidate).toBeTruthy();
		expect(blogToValidate.isPublished).toBeFalsy();
		expect(blogs).toHaveLength(2);
	});

	describe('that is published', () => {
		test('should include reference to the only author', async () => {
			const author = (await authorsInDb())[0];
			await publishBlog(sampleBlog2, token);
			const response = await getBlogs();

			const blogs = response.body;

			// Making sure both blogs are owned by the only author
			// by verifying the presence of the associated id
			const isOnlyAuthorReferenced
				= blogs.reduce((total, blog) => {
					if (blog.author.toString() === author.id.toString()) {
						return total + 1;
					}
				}, 0) === 2;
			expect(isOnlyAuthorReferenced).toBeTruthy();
		});

		test('should set the publish date after publication', async () => {
			await publishBlog(sampleBlog2, token);
			const response = await getBlogs();

			const blogs = response.body;
			const blogToValidate = blogs.find(blog => {
				return blog.title === sampleBlog2.title
					&& blog.content === sampleBlog2.content;
			});

			expect(blogToValidate.isPublished).toBeTruthy();
			expect(blogToValidate.publishedAt).toBeTruthy();
		});
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

	test('should delete a blog and its associated comments should not get deleted', async () => {
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
		expect(commentsAtEnd).toHaveLength(1);
	});
});

describe('update of blog', () => {
	beforeEach(async () => {
		await Category.deleteMany({});
		await Tag.deleteMany({});

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
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send(updatedBlog)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedTitles = blogsAtEnd.body.map(r => r.title);
		expect(updatedTitles).toContain(updatedBlog.title);
	});

	test('should successfully update blog preview image', async () => {
		const blogs = await blogsInDb();
		const blogToUpdate = await getBlog(blogs[0].id);

		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const updatedBlogImageResponse = await request
			.put(`/api/blogs/${blogToUpdate.body.id}/image-update/authors-only`)
			.attach('blogImage', filePath, { filename: 'image.png' })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);


		expect(updatedBlogImageResponse.body.imageId).toBeDefined();
		expect(updatedBlogImageResponse.body.imageId).not.toEqual(blogToUpdate.body.imageId);
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
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send(updatedBlog)
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await request.get('/api/blogs');
		const updatedAtEnd = blogsAtEnd.body[0].updatedAt;
		expect(updatedAtEnd).not.toBe(updatedAtStart);
	});

	test('should successfully add tag to blog', async () => {
		const blogsAtStart = await blogsInDb();
		const blogToUpdate = blogsAtStart[0];

		const tag = new Tag(sampleTag1);
		await tag.save();

		// Update the blog to add tag association
		await request
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send({
				...blogToUpdate,
				tags: [
					...blogToUpdate.tags,
					tag._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		const updatedTag = await Tag.findById(tag._id);

		expect(blogsAtEnd[0].tags).toHaveLength(1);
		expect(blogsAtEnd[0].tags.map(String)).toContain(tag._id.toString());
		expect(updatedTag.blogs).toHaveLength(1);
		expect(updatedTag.blogs.map(String)).toContain(blogsAtEnd[0].id.toString());

	});

	test('should successfully add category to blog', async () => {
		const blogsAtStart = await blogsInDb();
		const blogToUpdate = blogsAtStart[0];

		const category = new Category(sampleCategory2);
		await category.save();

		// Update the blog to update the category id in the blog
		await request
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send({
				...blogToUpdate,
				category: category._id
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		const updatedCategory = await Category.findById(category._id);

		expect(blogsAtEnd[0].category.toString()).toEqual(category._id.toString());
		expect(updatedCategory.blogs.map(String)).toContain(blogsAtEnd[0].id.toString());
	});

	test('should remove blog reference within tag after untagging', async () => {
		const blogToUpdate = await Blog.findOne({});
		const tag = new Tag(sampleTag1);

		// Add blog reference to tag
		tag.blogs.push(blogToUpdate._id);
		await tag.save();

		// Add tag reference to blog
		blogToUpdate.tags.push(tag._id);
		await blogToUpdate.save();

		expect(tag.blogs).toHaveLength(1);
		expect(blogToUpdate.tags).toHaveLength(1);

		// Update the blog to remove the tag association
		await request
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send({ ...blogToUpdate.toObject(), tags: [] })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		// Fetch the updated tag from the database
		const updatedTag = await Tag.findById(tag._id);

		// Verify that the blog reference is removed from the tag
		expect(updatedTag.blogs).toHaveLength(0);
		expect(updatedTag.blogs).not.toContain(blogToUpdate._id);
	});

	test('should verify that the blog is not private', async () => {
		const blogsAtStart = await blogsInDb();
		const blogToUpdate = blogsAtStart[0];

		// Update the blog by toggling the private property
		await request
			.put(`/api/blogs/${blogToUpdate.id}/publish/authors-only`)
			.send({ ...blogToUpdate, isPrivate: !blogToUpdate.isPrivate })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const blogsAtEnd = await blogsInDb();
		expect(blogsAtEnd[0].isPrivate).toBeFalsy();
	});
});

describe('liking a blog feature', () => {
	let blog;
	let viewer;
	let blogToUpdate;

	beforeEach(async () => {
		await deleteDbsForBlogTests();
		await populateBlogsDb();
		token = null;
		token = await loginViewer(request, sampleViewer1);

		// initialize blog and viewer every test
		blog = await Blog.findOne({});
		viewer = await Viewer.findOne({});
		blogToUpdate = {
			title: blog.title,
			content: blog.content,
			author: blog.author,
			isPrivate: blog.isPrivate,
			createdAt: blog.createdAt,
			updatedAt: blog.updatedAt,
			comments: blog.comments,
			tags: blog.tags
		};
	});

	test('should allow user/viewer to like a blog', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());
	});

	test('should only allow user/viewer to like a blog once', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());

		// attempt for 2nd like
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlogForThe2ndTime = await Blog.findOne({});
		expect(updatedBlogForThe2ndTime.likes).toHaveLength(1);
	});

	test('should allow a user/viewer to unlike a blog that was liked prevoiusly', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes.map(String)).toContain(viewer._id.toString());

		const filteredLikes = updatedBlog
			.likes.filter(id => !id.equals(viewer._id));

		// attempt for 2nd like
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: filteredLikes
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlogForThe2ndTime = await Blog.findOne({});
		expect(updatedBlogForThe2ndTime.likes).toHaveLength(0);
		expect(updatedBlogForThe2ndTime.likes.map(String))
			.not.toContain(viewer._id.toString());
	});

	test('should contain the correct amount of likes by users/viewers', async () => {
		const initialLikesCount = blog.likes.length;
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const updatedBlog = await Blog.findOne({});
		expect(updatedBlog.likes).toHaveLength(initialLikesCount + 1);
	});

	test('should not allow unauthorized user/viewer to like a blog', async () => {
		await request.put(`/api/blogs/${blog._id}`)
			.send({
				...blogToUpdate, likes: [
					...blog.likes, viewer._id
				]
			})
			.expect(401);
	});
});

afterAll(() => {
	mongoose.connection.close();
	server.close();
	console.log('Blog Tests: Close the server');
});