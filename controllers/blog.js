const _ = require('lodash');
const mongoose = require('mongoose');

const Blog = require('../models/blog');
const Category = require('../models/category');
const Tag = require('../models/tag');
const { handlePagination, handleFiltering, handleSorting } = require('../utils/query-handlers');
const { deleteImageFromGridFS } = require('./reusables');

const insertBlogToTag = async (tagId, blogId) => {
	try {
		await Tag.findByIdAndUpdate(tagId, {
			$push: {
				blogs: blogId,
			},
		});
	} catch (error) {
		console.log(error);
	}
};

exports.blogCreate = async (req, res, next) => {
	const { title, content, isPrivate, tags, category } = req.body;
	try {
		if (!title || !content) {
			return res.status(400)
				.json({ error: 'The blog must have title and content' });
		}

		if (!req.file) {
			return res.status(400)
				.json({ error: 'The blog must have preview image' });
		}

		let blog;
		const { publishAction } = req.params;

		if (!['save', 'publish'].includes(publishAction)) {
			return res.status(400).json({ error: 'Invalid publishAction' });
		}

		blog = new Blog({
			title,
			content,
			// null cannot be passed directly while image upload is necessary for blog create
			// So, I'm passing 'NONE' instead, then convert it to null
			category: category === 'NONE' ? null : category,
			author: req.user._id,
			tags: tags || [],
			isPrivate: isPrivate,
		});

		if (req.file) {
			blog.imageId = req.file.id;
		}

		if (publishAction === 'publish') {
			blog.isPublished = true;
		}

		const savedBlog = await blog.save();

		if (category && mongoose.Types.ObjectId.isValid(category)) {
			const insertBlogRefToCategory = async () => {
				const fetchedCategory = await Category.findById(category);

				fetchedCategory.blogs.push(blog._id);
				await fetchedCategory.save();
			};

			insertBlogRefToCategory();
		}

		if (tags) {
			const insertBlogToTagPromises = tags.map((tag) =>
				insertBlogToTag(tag, blog._id)
			);
			await Promise.all(insertBlogToTagPromises);
		}

		res.status(201).json(savedBlog);
	} catch (error) {
		next(error);
	}
};

exports.blogs = async (req, res, next) => {
	try {
		const pagination = handlePagination(req);
		const filters = handleFiltering(req, ['category']);
		const sorts = handleSorting(req, {
			oldest: { date: 1 },
			latest: { date: -1 }
		});

		const blogs = await Blog.find(filters)
			.skip(pagination.skip)
			.limit(pagination.limit)
			.sort(sorts);

		res.json(blogs);
	} catch (err) {
		next(err);
	}
};

exports.publishedBlogListFetch = async (req, res, next) => {
	try {
		const pagination = handlePagination(req);
		const filters = handleFiltering(req, ['category']);
		const sorts = handleSorting(req, {
			oldest: { date: 1 },
			latest: { date: -1 }
		});

		const publishedBlogs = await Blog.find({
			isPublished: true,
			isPrivate: false,
			...filters
		}).skip(pagination.skip)
			.limit(pagination.limit)
			.sort(sorts);
		res.json(publishedBlogs);
	} catch (err) {
		next(err);
	}
};

exports.totalUncategorizedPublishedBlogs = async (req, res, next) => {
	try {
		const uncategorizedPublishedBlogsLength = await Blog.countDocuments({
			isPublished: true,
			isPrivate: false,
			category: null
		});

		res.json({ blogsLength: uncategorizedPublishedBlogsLength });
	} catch (err) {
		next(err);
	}
};

exports.blogFetch = async (req, res, next) => {
	const { id } = req.params;

	try {
		const blog = await Blog.findById(id).populate('author');

		if (!blog) {
			return res.status(404).json({ message: 'Blog not found' });
		}

		res.json(blog);
	} catch (err) {
		next(err);
	}
};

const removeBlogRefs = async (props) => {
	const { docsIds, DocSchema, blogToUpdateId } = props;
	for (const docId of docsIds) {
		const doc = await DocSchema.findById(docId);
		if (doc && doc.blogs) {
			doc.blogs = doc.blogs.filter(
				(blogId) => blogId.toString() !== blogToUpdateId.toString()
			);
			await doc.save();
		}
	}
};

const blogCategoryUpdate = async (blogToUpdate, updatedData) => {
	const oldCategoryId = blogToUpdate.category;
	const newCategoryId = updatedData.category;

	if (oldCategoryId !== newCategoryId) {
		// Remove blog reference from old tags
		if (oldCategoryId) {
			await removeBlogRefs({
				docsIds: [oldCategoryId],
				DocSchema: Category,
				blogToUpdateId: blogToUpdate._id
			});
		}

		// Add blog reference to new tags
		if (newCategoryId) {
			const category = await Category.findById(newCategoryId);
			category.blogs.push(blogToUpdate._id);
			await category.save();
		}
	}
};

const blogTagsUpdate = async (blogToUpdate, updatedData) => {
	const oldTagsIds = blogToUpdate.tags;
	const newTagsIds = updatedData.tags;
	const hasTagUpdates =
		JSON.stringify(oldTagsIds.sort()) !==
		JSON.stringify(newTagsIds.sort());

	if (hasTagUpdates) {
		// Remove blog reference from old tags
		await removeBlogRefs({
			docsIds: oldTagsIds,
			DocSchema: Tag,
			blogToUpdateId: blogToUpdate._id
		});

		// Add blog reference to new tags
		for (const tagId of newTagsIds) {
			const tag = await Tag.findById(tagId);
			tag.blogs.push(blogToUpdate._id);
			await tag.save();
		}
	}
};

exports.blogImageUpdate = async (req, res, next) => {
	const { id } = req.params;
	try {
		const blogToUpdate = await Blog.findById(id);
		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		if (req.file && req.file.id) {
			if (blogToUpdate.imageId) {
				// Delete previous image from GridFSBucket
				await deleteImageFromGridFS(blogToUpdate.imageId);
			}

			blogToUpdate.imageId = req.file.id;
			await blogToUpdate.save();
			res.status(200).json(blogToUpdate);
		} else {
			return res.status(400).json({ message: 'Uploaded blog picture not found' });
		}
	} catch (err) {
		next(err);
	}
};

exports.blogUpdate = async (req, res, next) => {
	const { id, publishAction } = req.params;

	try {
		const blogToUpdate = await Blog.findById(id);
		const blogPropsToUpdate = {};

		// Iterate over each field in the req body
		// to isolate blog props that'll be updated	
		for (const key in req.body) {
			// eslint-disable-next-line no-prototype-builtins
			if (req.body.hasOwnProperty(key)) {
				if (!_.isEqual(blogToUpdate[key], req.body[key])) {
					blogPropsToUpdate[key] = req.body[key];
				}
			}
		}

		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		if (
			blogToUpdate.author.toString() !== req.user._id.toString() &&
			req.originalUrl.includes('authors-only')
		) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		if (publishAction === 'publish') {
			await Blog.findByIdAndUpdate(blogToUpdate._id, { isPublished: true });
		}

		// Update one to one ref for both blogs and tags/categories
		if (req.originalUrl.includes('authors-only')) {
			await blogTagsUpdate(blogToUpdate, req.body);
			await blogCategoryUpdate(blogToUpdate, req.body);
		}

		const authorId = blogPropsToUpdate['author']
			? blogPropsToUpdate.author.id
			: req.body.author.id;

		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			{
				...blogPropsToUpdate,
				author: authorId
			},
			{ new: true }
		);

		res.json(updatedBlog);
	} catch (err) {
		next(err);
	}
};

exports.blogDelete = async (req, res, next) => {
	const { id } = req.params;

	try {
		const blog = await Blog.findById(id);

		if (!blog) {
			return res.status(404).send({ message: 'Blog not found' });
		}

		await blog.deleteOne({ _id: blog._id });

		const asyncTasks = [];
		if (blog.tags) {
			asyncTasks.push(removeBlogRefs({
				docsIds: blog.tags,
				DocSchema: Tag,
				blogToUpdateId: blog._id
			}));
		}

		if (blog.category) {
			asyncTasks.push(removeBlogRefs({
				docsIds: [blog.category],
				DocSchema: Category,
				blogToUpdateId: blog._id
			}));
		}

		await Promise.all(asyncTasks);

		res.status(204).send();
	} catch (err) {
		next(err);
	}
};
