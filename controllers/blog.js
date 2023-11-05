const _ = require('lodash');
const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const Blog = require('../models/blog');
const Category = require('../models/category');
const Tag = require('../models/tag');
const ImageFile = require('../models/image-file');
const {
	handlePagination,
	handleFiltering,
	handleSorting
} = require('../utils/query-handlers');
const { getImageFileIdForUpdate, updateImageFileDocRefs } = require('./reusables');
const { imageFileCreateAndSetRefId } = require('./image-file');
const { validationResult } = require('express-validator');

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

		// Either file or existingImageId must exists
		if (!req.file && !req.body.existingImageId) {
			return res.status(400)
				.json({ error: 'The blog must have preview image' });
		}

		let blog;
		const { publishAction } = req.params;

		if (!['save', 'publish'].includes(publishAction)) {
			return res.status(400).json({ error: 'Invalid write action' });
		}

		blog = new Blog({
			title,
			content,
			// null object cannot be passed as request to backend while image upload is necessary for blog create
			// So'NULL' will be passed instead, then convert it to null using a custom middleware
			category,
			author: req.user._id,
			tags: tags || [],
			isPrivate: isPrivate,
		});


		if (req.file) {
			await imageFileCreateAndSetRefId(req, blog);
		} else if (req.body.existingImageId) {
			blog.imageFile = req.body.existingImageId;
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

exports.totalPublishedBlogs = async (_req, res, next) => {
	try {
		const totalPublishedBlogs = Blog.countDocuments({
			isPublished: true,
			isPrivate: false,
		});
		res.json({ size: totalPublishedBlogs });
	} catch (err) {
		next(err);
	}
};

exports.blogs = async (req, res, next) => {
	try {
		const pagination = handlePagination(req);
		const filters = handleFiltering(req, ['category']);
		const sorts = handleSorting(req, {
			oldest: { publishedAt: 1 },
			latest: { publishedAt: -1 }
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
			oldest: { publishedAt: 1 },
			latest: { publishedAt: -1 }
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
		const totalUncategorizedPublishedBlogs = await Blog.countDocuments({
			isPublished: true,
			isPrivate: false,
			category: null
		});

		res.json({ size: totalUncategorizedPublishedBlogs });
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


exports.publishedBlogFetch = async (req, res, next) => {
	const filters = handleFiltering(req, ['slug, id']);

	try {
		const blog = await Blog.findOne({
			isPrivate: false,
			isPublished: true,
			...filters,
		});
		// .populate('category')
		// .populate('tags')
		// .populate('comments');
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
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { id } = req.params;
	try {
		const blogToUpdate = await Blog.findById(id).populate('imageFile');
		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		if (req.file && req.file.id) {
			const imageFileIdForUpdate = await getImageFileIdForUpdate(req, blogToUpdate);
			blogToUpdate.imageFile = imageFileIdForUpdate;
			blogToUpdate.save();

			res.status(200).json(blogToUpdate);
		} else {
			await updateImageFileDocRefs({
				toBeReplaced: blogToUpdate.imageFile,
				toBeAdded: req.body.existingImageId || null
			}, blogToUpdate.id);

			blogToUpdate.imageFile = req.body.existingImageId || null;
			blogToUpdate.save();

			if (req.body?.credit) {
				await ImageFile.findByIdAndUpdate(
					req.body.existingImageId,
					{ credit: req.body.credit },
					{ new: true }
				);
			}

			res.status(200).json(blogToUpdate);
		}
	} catch (err) {
		next(err);
	}
};

exports.blogLikeUpdate = async (req, res, next) => {
	const { blogId, userId } = req.params;
	try {
		const blogToUpdate = await Blog.findById(blogId);

		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		const hasUserLikedTheBlog = blogToUpdate.likes.includes(userId);
		if (hasUserLikedTheBlog) {
			blogToUpdate.likes = blogToUpdate.likes.filter(id => id === userId);
		} else {
			blogToUpdate.likes.push(userId);
		}

		blogToUpdate.save();
		res.json(blogToUpdate);
	} catch (error) {
		next(error);
	}
};

exports.blogUpdate = async (req, res, next) => {
	const { id, publishAction } = req.params;
	try {
		// Get the current state of blog by ID excluding slug property
		const blogToUpdate = await Blog.findById(id);
		const blogPropsToUpdate = {
			slug: slugify(req.body.title, { lower: true, strict: true })
		};

		// Iterate over each field in the req body
		// to isolate blog props that'll be updated	
		for (const key in req.body) {
			if (key === 'slug') continue;
			if (Object.hasOwn(req.body, key)) {
				if (!_.isEqual(blogToUpdate[key], req.body[key])) {
					blogPropsToUpdate[key] = req.body[key];
				}
			}
		}

		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		// Respond with unauthorized if author is not the blog author		
		if (blogToUpdate.author.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Unauthorized' });
		}

		if (publishAction === 'publish') {
			await Blog.findByIdAndUpdate(blogToUpdate._id, { isPublished: true });
		}

		// Update one to one ref for both blogs and tags/categories
		await blogTagsUpdate(blogToUpdate, req.body);
		await blogCategoryUpdate(blogToUpdate, req.body);

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
