const { default: mongoose } = require('mongoose');
const getGfs = require('../../utils/gfs');
const ImageFile = require('../../models/image-file');
const { validationResult } = require('express-validator');

exports.validateRequestData = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}
	next();
};

exports.updateImageFileDocRefs = async (imageFileRefs, docId) => {
	const { toBeReplaced, toBeAdded } = imageFileRefs;
	// These two being equal means no image file ref changes so no need for unnecessary updates
	if (toBeReplaced == toBeAdded) return;
	if (toBeReplaced) {
		const imageDoc = await ImageFile.findById(toBeReplaced);
		if (!imageDoc) return;
		imageDoc.referencedDocs = imageDoc.referencedDocs.filter(doc => docId === doc);
		await imageDoc.save();
	}

	if (toBeAdded) {
		const imageDoc = await ImageFile.findById(toBeAdded);
		if (!imageDoc) return;
		imageDoc.referencedDocs.push(docId);
		await imageDoc.save();
	}
};

exports.getImageFileIdForUpdate = async (req, doc) => {
	const doesImageAsReplacementExists = await this.hasImageInGridFS(req.body.existingImageId);
	const doesImageFileDocAsReplacementExists = await ImageFile.findById(req.body.existingImageId);
	let newImageFileId;

	// Create a new image file doc using the uploaded image file
	if (req.body.existingImageId === null
		&& !doesImageFileDocAsReplacementExists
		&& !doesImageAsReplacementExists) {
		const newImageFile = new ImageFile({
			fileType: req.file.mimetype,
			fileName: req.file.originalname,
			size: req.file.size,
			referencedDocs: [doc.id],
			_id: req.file.id,
			...(req.body?.credit ? { credit: req.body.credit } : {})
		});
		newImageFileId = newImageFile._id;
		newImageFile.save();
	} else {
		newImageFileId = doc.imageFile;
	}

	return newImageFileId;
};

exports.hasImageInGridFS = async (imageId) => {
	try {
		const objectId = new mongoose.Types.ObjectId(imageId);
		const gfs = await getGfs();
		const files = await gfs.find({ _id: objectId }).toArray();
		return files && files.length > 0;
	} catch (err) {
		console.error('Error in finding image from grid fs:', err);
		throw err;
	}
};

exports.deleteImageFromGridFS = async (imageId) => {
	try {
		const gfs = await getGfs();
		await gfs.delete(new mongoose.Types.ObjectId(imageId));
		console.log('Image deleted successfully');
	} catch (err) {
		console.error('Error in deleting image from grid fs:', err);
		throw err;
	}
};

exports.resourceImageFetch = async (req, res, next) => {
	const { id } = req.params;
	try {
		const gfs = await getGfs();
		const objectId = new mongoose.Types.ObjectId(id);
		const files = await gfs.find({ _id: objectId }).toArray();
		if (!files || files.length === 0) {
			return res.status(404).json({ error: 'No file exists' });
		}

		// Make sure it is image
		if (files[0].contentType === 'image/jpeg' || files[0].contentType === 'image/png') {
			const mime = files[0].contentType;
			res.set('Content-Type', mime);

			// Download file and read output to abrowser
			const readstream = gfs.openDownloadStream(objectId);
			readstream.pipe(res);
		} else {
			// Otherwise, indicate that it is not an image
			res.status(404).json({
				error: 'Not an image'
			});
		}
	} catch (err) {
		next(err);
	}
};
