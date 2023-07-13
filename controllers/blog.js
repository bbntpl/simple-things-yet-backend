const _ = require('lodash');

const Blog = require('../models/blog');
const Category = require('../models/category');
const Tag = require('../models/tag');

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
	const { title, content, isPrivate, tags } = req.body;
	try {
		if (!title || !content) {
			return res
				.status(400)
				.json({ error: 'The blog must have title and content' });
		}

		let blog;
		const { publishAction } = req.params;

		if (!['save', 'publish'].includes(publishAction)) {
			return res.status(400).json({ error: 'Invalid publishAction' });
		}

		blog = new Blog({
			title,
			content,
			author: req.user._id,
			tags: tags || [],
			isPrivate: isPrivate,
		});

		if (publishAction === 'publish') {
			blog.isPublished = true;
		}

		const savedBlog = await blog.save();

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
		const blogs = await Blog.find({});
		res.json(blogs);
	} catch (err) {
		next(err);
	}
};

exports.publishedBlogListFetch = async (req, res, next) => {
	try {
		const publishedBlogs = await Blog.find({
			isPublished: true,
			isPrivate: false
		});
		res.json(publishedBlogs);
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

const removeBlogRefs = async (docsIds, DocSchema, blogToUpdateId) => {
	for (const docId of docsIds) {
		const doc = await DocSchema.findById(docId);
		doc.blogs = doc.blogs.filter(
			(blogId) => blogId.toString() !== blogToUpdateId.toString()
		);
		await doc.save();
	}
};

const blogCategoryUpdate = async (blogToUpdate, updatedData) => {
	const oldCategoryId = blogToUpdate.category;
	const newCategoryId = updatedData.category;

	if (oldCategoryId !== newCategoryId) {
		// Remove blog reference from old tags
		if (oldCategoryId) {
			await removeBlogRefs([oldCategoryId], Category, blogToUpdate._id);
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
		await removeBlogRefs(oldTagsIds, Tag, blogToUpdate._id);

		// Add blog reference to new tags
		for (const tagId of newTagsIds) {
			const tag = await Tag.findById(tagId);
			tag.blogs.push(blogToUpdate._id);
			await tag.save();
		}
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
		await blogTagsUpdate(blogToUpdate, req.body);
		await blogCategoryUpdate(blogToUpdate, req.body);

		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			{ ...blogPropsToUpdate },
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

		const deletedBlog = await blog.deleteOne({ _id: blog._id }).then((doc) => {
			removeBlogRefs(doc.tags, doc._id).then(() => {
				console.log('blog is successfully deleted');
			});
		});

		res.status(204).json(deletedBlog);
	} catch (err) {
		next(err);
	}
};
