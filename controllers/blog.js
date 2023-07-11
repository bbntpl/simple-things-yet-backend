const Blog = require('../models/blog');
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

const removeBlogIdsFromCategories = async (tags, blogToUpdateId) => {
	for (const tagId of tags) {
		const tag = await Tag.findById(tagId);
		tag.blogs = tag.blogs.filter(
			(blogId) => blogId.toString() !== blogToUpdateId.toString()
		);
		await tag.save();
	}
};

const blogTagUpdate = async (blogToUpdate, updatedData) => {
	const oldCategories = blogToUpdate.tags;
	const newCategories = updatedData.tags;
	const hasTagUpdates =
		JSON.stringify(oldCategories.sort()) !==
		JSON.stringify(newCategories.sort());

	if (hasTagUpdates) {
		// Remove blog reference from old tags
		await removeBlogIdsFromCategories(oldCategories, blogToUpdate._id);

		// Add blog reference to new tags
		for (const tagId of newCategories) {
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
		isPrivate
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
		await blogTagUpdate(blogToUpdate, req.body);
		await blogLikesUpdate(blogToUpdate, req.body);

		const propsToUpdate = {
			title,
			content,
			isPrivate,
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
			removeBlogIdsFromCategories(doc.tags, doc._id).then(() => {
				console.log('blog is successfully deleted');
			});
		});

		res.status(204).json(deletedBlog);
	} catch (err) {
		next(err);
	}
};
