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

const removeBlogRefs = async (docRefs, DocSchema, blogToUpdateId) => {
	console.log(docRefs);
	for (const otherDoc of docRefs) {
		const doc = await DocSchema.findById(otherDoc.Id);
		doc.blogs = doc.blogs.filter(
			(blogId) => blogId.toString() !== blogToUpdateId.toString()
		);
		await doc.save();
	}
};

const blogTagsUpdate = async (blogToUpdate, updatedData) => {
	const oldTags = blogToUpdate.tags;
	const newTags = updatedData.tags;
	const hasTagUpdates =
		JSON.stringify(oldTags.sort()) !==
		JSON.stringify(newTags.sort());

	if (hasTagUpdates) {
		// Remove blog reference from old tags
		await removeBlogRefs(oldTags, Tag, blogToUpdate._id);

		// Add blog reference to new tags
		for (const tagId of newTags) {
			const tag = await Tag.findById(tagId);
			tag.blogs.push(blogToUpdate._id);
			await tag.save();
		}
	}
};

const blogLikesUpdate = async (blogToUpdate, updatedData) => {
	const oldLikes = blogToUpdate.likes;
	const newLikes = updatedData.likes;

	const oldLikesSet = new Set(oldLikes.map(String));
	const newLikesSet = new Set(newLikes.map(String));

	// If new likes is duplicated, disallow update
	const hasLikesDuplicate = newLikesSet.size !== newLikes.length;

	if (hasLikesDuplicate) return;

	const hasNoLikesUpdate =
		oldLikesSet.size === newLikesSet.size &&
		[...oldLikesSet].every((id) => newLikesSet.has(id));

	// No updates needed because the likes arrays are the same
	if (hasNoLikesUpdate) return;

	let updatedLikes;

	if (oldLikesSet.size < newLikesSet.size) {
		// A viewer id gests added on likes array
		updatedLikes = [...oldLikesSet, ...newLikesSet].filter(
			(id) => !oldLikesSet.has(id) || !newLikesSet.has(id)
		);
	} else {
		// A viewer id gets removed on likes array
		updatedLikes = oldLikes.filter((id) => newLikesSet.has(id.toString()));
	}

	const blog = await Blog.findByIdAndUpdate(blogToUpdate._id, {
		likes: updatedLikes,
	});
	await blog.save();
};

exports.blogUpdate = async (req, res, next) => {
	const { id, publishAction } = req.params;
	const {
		author,
		title,
		content,
		isPrivate,
		category
	} = req.body;
	try {
		const blogToUpdate = await Blog.findById(id);

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
			blogToUpdate.isPublished = true;
			blogToUpdate.save();
		}
		await blogTagsUpdate(blogToUpdate, req.body);
		await blogLikesUpdate(blogToUpdate, req.body);
		await removeBlogRefs(blogToUpdate.category, Category, req.body);

		const propsToUpdate = {
			title,
			content,
			isPrivate,
			category,
			author: author.id
		};

		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			{ ...propsToUpdate },
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
