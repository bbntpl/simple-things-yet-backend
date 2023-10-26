const { body, validationResult } = require('express-validator');

const Category = require('../models/category');
const { hasImageExistsInGridFS, getFilesnamesFromGridFS } = require('./reusables');
const { handleSorting, handleFiltering, handlePagination } = require('../utils/query-handlers');
const { default: mongoose } = require('mongoose');
const ImageFile = require('../models/image-file');
const { imageFileCreateAndSetRefId } = require('./image-file');

const validateCategory = [
	body('name')
		.trim()
		.notEmpty()
		.withMessage('Name is a required input')
		.isString()
		.withMessage('The type of name must be string')
];

exports.validateCategory = [
	...validateCategory
];

exports.categoryCreate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { name, description } = req.body;
	try {
		const isCategoryExists = await Category.findOne({ name });

		if (isCategoryExists && String(isCategoryExists._id) !== String(req.params.id)) {
			return res.status(400).json({ error: `Category ${req.body.name} exists already` });
		}

		const category = { name, description };
		const newCategory = new Category(category);

		if (req.file) {
			const doesFileExistsAlready = await hasImageExistsInGridFS(req.file.id);
			console.log(doesFileExistsAlready, filesnames);
			if (doesFileExistsAlready) {
				category.imageFile = req.file.id;
			} else {
				await imageFileCreateAndSetRefId(req, newCategory);
			}
		}

		await newCategory.save();
		res.status(201).json(newCategory);
	} catch (err) {
		next(err);
	}
};

exports.categories = async (req, res, next) => {
	try {
		const categories = await Category.find({});
		res.json(categories);
	} catch (err) {
		next(err);
	}
};

exports.categoriesWithPublishedBlogs = async (req, res, next) => {
	try {
		const pagination = handlePagination(req);
		const filters = handleFiltering(req, []);
		const sorts = handleSorting(req, {
			asc: { name: 1 },
			desc: { name: -1 }
		});

		const excludeIds = req.query.excludeIds === '' ? []
			: req.query.excludeIds.split(',').map(id => {
				return new mongoose.Types.ObjectId(id);
			});

		const pipeline = [
			// Stage 1: Append the referenced blog documents to the current category document
			{
				$lookup: {
					from: 'blogs',
					localField: '_id',
					foreignField: 'category',
					as: 'blogs'
				}
			},
			// Stage 2: Filter out categories without published blogs
			{
				$match: {
					'blogs.isPublished': true,
					'blogs.isPrivate': false,
				}
			},
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
													{ $not: { $in: ['$$blog._id', excludeIds || []] } }
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
			...Object.entries(filters)
				.map(([key, value]) => ({ $match: { [key]: value } })),
			{ $sort: sorts },
			{ $skip: pagination.skip },
			{ $limit: pagination.limit }
		];

		const categories = await Category.aggregate(pipeline);
		res.json(categories);
	} catch (err) {
		next(err);
	}
};

exports.categoriesWithLatestBlogs = async (req, res, next) => {
	try {
		const pagination = handlePagination(req);
		const filters = handleFiltering(req, []);
		const sorts = handleSorting(req, {
			asc: { name: 1 },
			desc: { name: -1 },
			larger: { totalPublishedBlogs: 1 },
			smaller: { totalPublishedBlogs: - 1 },
		});

		console.log(req.query);
		const excludeIds = req.query.excludeIds === undefined
			|| req.query.excludeIds === '' ? []
			: req.query.excludeIds.map(id => {
				return new mongoose.Types.ObjectId(id);
			});

		const pipeline = [
			// Stage 1: Append the referenced blog documents to the current category document
			{
				$lookup: {
					from: 'blogs',
					localField: '_id',
					foreignField: 'category',
					as: 'blogs'
				}
			},
			// Stage 2: Filter out categories without published blogs
			{
				$match: {
					'_id': { $nin: excludeIds },
					'blogs.isPublished': true,
					'blogs.isPrivate': false
				},
			},
			// Stage 3: Add new field that gets filters publicly available blogs
			// and not yet fetched beforehand
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
													{ $not: { $in: ['$$blog._id', excludeIds || []] } }
												]
											},
											then: '$$blog',
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
			// Stage 4: Add new field blog id
			{
				$addFields: {
					publishedBlogs: {
						$map: {
							input: '$publishedBlogs',
							as: 'blog',
							in: {
								$mergeObjects: [
									'$$blog',
									{
										id: '$$blog._id',
									},
								],
							},
						},
					},
				},
			},
			// Stage 5: Remove non needed embedded documents (or/and its fields)
			// and fields
			{
				$unset: ['blogs', '__v', 'publishedBlogs._id', 'publishedBlogs.__v']
			},
			// Stage 6: Add own size of total published blogs
			{
				$addFields: {
					totalPublishedBlogs: {
						$size: '$publishedBlogs'
					}
				}
			},
			// Stage 7: Only match categories between is greater than equal to 3
			{
				$match: {
					$expr: {
						$gte: ['$totalPublishedBlogs', 2],
					}
				}
			},
			// Stage 8: Only get the first 2 blogs (maximum)
			{
				$addFields: {
					publishedBlogs: {
						$slice: ['$publishedBlogs', 0, {
							$min: [
								{ $size: '$publishedBlogs' },
								2
							]
						}]
					}
				}
			},
			...Object.entries(filters)
				.map(([key, value]) => ({ $match: { [key]: value } })),
			{ $sort: sorts },
			{ $skip: pagination.skip },
			{ $limit: pagination.limit }
		];

		const categories = await Category.aggregate(pipeline);
		res.json(categories);
	} catch (err) {
		next(err);
	}
};

exports.categoryFetch = async (req, res, next) => {
	const { id } = req.params;
	try {
		const category = await Category.findById(id);
		res.json(category);
	} catch (err) {
		next(err);
	}
};

exports.categoryImageUpdate = async (req, res, next) => {
	const { id } = req.params;
	try {
		const categoryToUpdate = await Category.findById(id);
		if (!categoryToUpdate) {
			return res.status(404).json({ error: 'Category not found' });
		}

		if (req.file && req.file.id) {
			const doesCurrentImageExists = await hasImageExistsInGridFS(categoryToUpdate.imageFile?.id);
			const doesImageAsReplacementExists = await hasImageExistsInGridFS(req.body?.imageFile);
			let newImageFileId;

			// If both IDs are not equal and uploaded is an existing image, then replace the current image with an
			// existing image from db	
			if (req.body?.imageFile
				&& categoryToUpdate.imageFile !== req.body.imageFile
				&& doesImageAsReplacementExists) {
				newImageFileId = req.body.imageFile;
			} else if (doesCurrentImageExists) {
				newImageFileId = req.file.id;
			} else {
				const newImageFile = new ImageFile({
					fileType: req.file.mimetype,
					fileName: req.file.originalname,
					size: req.file.size,
					referencedDocs: [categoryToUpdate.id],
					_id: req.file.id,
					...(req.body.credit ? { credit: JSON.parse(req.body.credit) } : {})
				});
				newImageFileId = newImageFile._id;
				newImageFile.save();
			}

			categoryToUpdate.imageFile = newImageFileId;
			await categoryToUpdate.save();
			res.status(200).json(categoryToUpdate);
		} else {
			return res.status(400).json({ message: 'Uploaded category image not found' });
		}
	} catch (err) {
		next(err);
	}
};

exports.categoryUpdate = async (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	const { id } = req.params;

	try {
		const updatedCategory = {
			name: req.body.name,
			description: req.body.description,
			blogs: req.body.blogs
		};

		const categoryToUpdate = await Category.findByIdAndUpdate(
			id,
			{ ...updatedCategory },
			{ new: true }
		);

		if (!categoryToUpdate) {
			return res.status(400).json({ error: `category "${req.body.name}" doesn/'t exist` });
		}

		res.json(categoryToUpdate);
	} catch (err) {
		next(err);
	}
};

exports.categoryDelete = async (req, res, next) => {
	const { id } = req.params;
	try {
		const category = await Category.findById(id);
		if (category.blogs.length > 0) {
			return res.status(400).json({
				message: 'You must remove all the associated blogs before deleting this category'
			});
		}

		await category.deleteOne({ _id: category._id });
		res.status(204).json(category);
	} catch (err) {
		next(err);
	}
};