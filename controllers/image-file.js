const Author = require('../models/author');
const Blog = require('../models/blog');
const Category = require('../models/category');
const ImageFile = require('../models/image-file');
const { deleteImageFromGridFS } = require('./reusables');

exports.imageFiles = async (_req, res, next) => {
	try {
		const imageFiles = await ImageFile.find({});
		res.json(imageFiles);
	} catch (err) {
		next(err);
	}
};

exports.imageFileFetch = async (req, res, next) => {
	const { id } = req.params;
	try {
		const imageFileDoc = await ImageFile.findById(id);
		res.json(imageFileDoc);
	} catch (err) {
		next(err);
	}
};

exports.imageFileCreate = async (req, res, next) => {
	try {
		const newImageFileDoc = new ImageFile({
			_id: req.file.id,
			size: req.file.size,
			fileName: req.file.originalname,
			fileType: req.file.mimetype,
			...(req.body.credit ? { credit: JSON.parse(req.body.credit) } : {})
		});
		newImageFileDoc.save();
		res.status(201).json(newImageFileDoc);
	} catch (err) {
		next(err);
	}
};

exports.imageFileCreateAndSetRefId = async (req, doc) => {
	const newImageFile = new ImageFile({
		fileType: req.file.mimetype,
		fileName: req.file.originalname,
		size: req.file.size,
		referencedDocs: [doc._id],
		_id: req.file.id,
		...(req.body.credit ? { credit: JSON.parse(req.body.credit) } : {})
	});
	doc.imageFile = newImageFile._id;
	newImageFile.save();
};

const blogImageFileDelete = async (ids) => {
	try {
		const blogsWithImageFile = await Blog.find({ _id: ids });
		if (!blogsWithImageFile || blogsWithImageFile.length === 0) return;

		await Promise.all(blogsWithImageFile.map(async (blog) => {
			blog.imageFile = null;
			await blog.save();
		}));
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const authorImageFileDelete = async (ids) => {
	try {
		const author = await Author.findOne({ _id: ids });
		if (!author) return;

		author.imageFile = null;
		await author.save();
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const categoryImageFileDelete = async (ids) => {
	try {
		const categoryWithImageFile = await Category.find({ _id: ids });
		if (!categoryWithImageFile || categoryWithImageFile.length === 0) return;

		await Promise.all(categoryWithImageFile.map(async (category) => {
			category.imageFile = null;
			await category.save();
		}));
	} catch (error) {
		console.error(error);
		throw error;
	}
};

exports.imageFileDelete = async (req, res, next) => {
	const { id } = req.params;
	try {
		// Fetch the document before deletion
		const imageFileToDelete = await ImageFile.findOne({ _id: id });

		if (!imageFileToDelete) {
			return res.status(404).json({ error: 'Image file not found' });
		}

		if (imageFileToDelete.referencedDocs.length > 0) {
			await blogImageFileDelete(imageFileToDelete.referencedDocs);
			await authorImageFileDelete(imageFileToDelete.referencedDocs);
			await categoryImageFileDelete(imageFileToDelete.referencedDocs);
		}

		// Delete the image file from the database
		const deletedImageFile = await ImageFile.deleteOne({ _id: id });
		await deleteImageFromGridFS(id);

		res.status(204).json(deletedImageFile);
	} catch (err) {
		next(err);
	}
};