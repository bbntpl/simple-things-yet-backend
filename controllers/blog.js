const Blog = require('../models/blog');
const Category = require('../models/category');

const insertBlogToCategory = async (categoryId, blogId) => {
	console.log(categoryId, blogId);
	try {
		await Category.findByIdAndUpdate(
			categoryId,
			{
				$push: {
					blogs: blogId
				}
			}
		);
	} catch (error) {
		console.log(error);
	}
};

exports.blogCreate = async (req, res, next) => {
	const { title, content, isPrivate, categories } = req.body;
	try {
		if (!title || !content) {
			return res.status(400).json({ message: 'The blog must have title and content' });
		}

		const blog = new Blog({
			title,
			content,
			author: req.user._id,
			categories: categories || [],
			isPrivate: isPrivate
		});
		const savedBlog = await blog.save();

		if (categories) {
			// Make sure that the categories has reference to the blog	
			const insertBlogToCategoryPromises
				= categories.map(category => insertBlogToCategory(category, blog._id));

			await Promise.all(insertBlogToCategoryPromises);
		}
		res.status(201).json(savedBlog);
	} catch (err) {
		next(err);
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

const removeBlogIdsFromCategories = async (categories, blogToUpdateId) => {
	for (const categoryId of categories) {
		const category = await Category.findById(categoryId);
		category.blogs = category.blogs.filter(blogId => blogId.toString() !== blogToUpdateId.toString());
		await category.save();
	}
};

const blogCategoryUpdate = async (blogToUpdate, updatedData) => {
	const oldCategories = blogToUpdate.categories;
	const newCategories = updatedData.categories;
	const hasCategoryUpdates = JSON.stringify(oldCategories.sort()) !== JSON.stringify(newCategories.sort());

	if (hasCategoryUpdates) {
		// Remove blog reference from old categories
		await removeBlogIdsFromCategories(oldCategories, blogToUpdate._id);

		// Add blog reference to new categories
		for (const categoryId of newCategories) {
			const category = await Category.findById(categoryId);
			category.blogs.push(blogToUpdate._id);
			await category.save();
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

	const hasNoLikesUpdate = oldLikesSet.size === newLikesSet.size
		&& [...oldLikesSet].every(id => newLikesSet.has(id));

	// No updates needed because the likes arrays are the same
	if (hasNoLikesUpdate) return;

	let updatedLikes;

	if (oldLikesSet.size < newLikesSet.size) {
		// A viewer id gests added on likes array
		updatedLikes = [...oldLikesSet, ...newLikesSet].filter(id => !oldLikesSet.has(id) || !newLikesSet.has(id));
	} else {
		// A viewer id gets removed on likes array
		updatedLikes = oldLikes.filter(id => newLikesSet.has(id.toString()));
	}

	const blog = await Blog.findByIdAndUpdate(blogToUpdate._id, { likes: updatedLikes });
	await blog.save();
};

exports.blogUpdate = async (req, res, next) => {
	const { id } = req.params;
	const { likes, ...restOfBlogContents } = req.body;
	try {
		const blogToUpdate = await Blog.findById(id);

		if (!blogToUpdate) {
			return res.status(404).json({ error: 'Blog not found' });
		}

		const updatedData = { ...req.body };

		await blogCategoryUpdate(blogToUpdate, updatedData);
		await blogLikesUpdate(blogToUpdate, updatedData);
		const updatedBlog = await Blog.findByIdAndUpdate(
			id,
			restOfBlogContents,
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

		const deletedBlog = await blog.deleteOne({ _id: blog._id })
			.then(doc => {
				removeBlogIdsFromCategories(doc.categories, doc._id)
					.then(() => {
						console.log('blog is successfully deleted');
					});
			});

		res.status(204).json(deletedBlog);

	} catch (err) {
		next(err);
	}
};