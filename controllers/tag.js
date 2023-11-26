const { body, validationResult } = require('express-validator');
const Tag = require('../models/tag');
const { default: slugify } = require('slugify');
const { handleFiltering, handleSorting } = require('../utils/query-handlers');

const validateTag = [
	body('name')
		.trim()
		.notEmpty()
		.withMessage('Name is a required input')
		.isString()
		.withMessage('The type of name must be string')
];

exports.validateTag = [
	...validateTag
];

exports.tagCreate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { name } = req.body;
	try {
		const isTagExists = await Tag.findOne({ name });

		if (isTagExists) {
			return res.status(400).json({ error: `Tag ${name} exists already` });
		}

		const newTag = new Tag({ name });
		await newTag.save();

		res.status(201).json(newTag);
	} catch (err) {
		next(err);
	}
};

exports.tags = async (req, res, next) => {
	try {
		const filters = handleFiltering(req, []);
		const sorts = handleSorting(req, {
			asc: { name: 1 },
			desc: { name: -1 }
		});

		const tags = await Tag.find({
			...filters
		}).sort(sorts);

		res.json(tags);
	} catch (err) {
		next(err);
	}
};

const getTagPublishedBlogsPipeline = ({ filters, sorts }) => {
	const pipeline = [
		// Stage 1: Append the referenced blog documents to the current tags document
		{
			$lookup: {
				from: 'blogs',
				localField: '_id',
				foreignField: 'tags',
				as: 'blogs'
			}
		},
		// Stage 2: Filter out categories without published blogs and excluded ids
		...Object.entries({
			...filters,
			'blogs.isPublished': true,
			'blogs.isPrivate': false,
		}).map(([key, value]) => ({ $match: { [key]: value } })),
		// Stage 3: Add new field that extract the published & public blogs ids
		{
			$addFields: {
				publishedBlogs: {
					$filter: {
						input: {
							$map: {
								input: '$blogs',
								as: 'blog',
								in: {
									$cond: {
										if: {
											$and: [
												{ $eq: ['$$blog.isPrivate', false] },
												{ $eq: ['$$blog.isPublished', true] },
											]
										},
										then: '$$blog._id',
										else: null
									}
								}
							}
						},
						as: 'blog',
						cond: { $ne: ['$$blog', null] }
					}
				}
			}
		},
		// Stage 4: Add id field
		{
			$addFields: {
				id: '$_id'
			}
		},
		// Stage 5: Remove non needed embedded documents and fields
		{
			$unset: ['blogs', '__v', '_id']
		},
		{ $sort: sorts },
	];

	return pipeline;
};

exports.tagsWithPublishedBlogs = async (req, res, next) => {
	try {
		const filters = handleFiltering(req, []);
		const sorts = handleSorting(req, {
			asc: { name: 1 },
			desc: { name: -1 },
		});

		const pipeline = getTagPublishedBlogsPipeline({ filters, sorts });
		const tags = await Tag.aggregate(pipeline);
		res.json(tags);
	} catch (err) {
		next(err);
	}
};

exports.tagWithPublishedBlogs = async (req, res, next) => {
	const { slug } = req.params;

	try {
		const filters = handleFiltering(req, []);
		const sorts = handleSorting(req, {
			asc: { name: 1 },
			desc: { name: -1 },
		});

		const pipeline = getTagPublishedBlogsPipeline({ filters, sorts });
		const tag = slug ? await Tag.findOne({ slug }) : null;

		if (!tag) {
			return res.status(404).json({ error: 'Tag not found' });
		}

		// Add additional stage to match only one tag by ID
		const result = await Tag.aggregate([
			{ $match: { _id: tag._id } },
			...pipeline,
		]);
		res.json(result[0]);
	} catch (err) {
		next(err);
	}
};

exports.tagFetchById = async (req, res, next) => {
	const { id } = req.params;
	try {
		const tag = await Tag.findById(id);
		res.json(tag);
	} catch (err) {
		next(err);
	}
};

exports.tagFetchBySlug = async (req, res, next) => {
	const { slug } = req.params;
	try {
		const tag = await Tag.findOne({ slug });
		res.json(tag);
	} catch (err) {
		next(err);
	}
};

exports.tagUpdate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { id } = req.params;

	try {
		const updatedTag = {
			name: req.body.name,
			blogs: req.body.blogs,
			slug: slugify(req.body.name, { lower: true, strict: true })
		};

		const tagToUpdate = await Tag.findByIdAndUpdate(
			id,
			updatedTag,
			{ new: true }
		);

		if (!tagToUpdate) {
			return res.status(400).json({ error: `tag "${req.body.name}" doesn/'t exist` });
		}

		res.json(tagToUpdate);
	} catch (err) {
		next(err);
	}
};

exports.tagDelete = async (req, res, next) => {
	const { id } = req.params;
	try {
		const tag = await Tag.findById(id);
		if (tag.blogs.length > 0) {
			return res.status(400).json({
				message: 'You must remove all the associated blogs before deleting this tag'
			});
		}

		await tag.deleteOne({ _id: tag._id });
		res.status(204).json(tag);
	} catch (err) {
		next(err);
	}
};