const { default: mongoose } = require('mongoose');
const getGfs = require('../../utils/gfs');
const ImageFile = require('../../models/image-file');

exports.getImageFileIdForUpdate = async (req, doc) => {
	const doesImageAsReplacementExists = await this.hasImageInGridFS(req.body.existingImageId);
	const doesImageFileDocAsReplacementExists = await ImageFile.findById(req.body.existingImageId);
	let newImageFileId;
	// If received imageFile from body and current doc imageFile ID is not equal then
	// the received imageFile is different which intends to modify the doc imageFile ID
	// with the imageId of an existing one

	// If the uploaded file is an existing image, then replace the current image with an
	// existing image by settings its image ref with the new image ID
	if (doc.imageFile !== req.body.existingImageId
		&& doesImageAsReplacementExists
		&& doesImageFileDocAsReplacementExists) {
		newImageFileId = req.body.imageFile;
		// Otherwise, create a new image file doc using the uploaded image file
	} else if (req.body.existingImageId === null
		&& !doesImageFileDocAsReplacementExists) {
		const newImageFile = new ImageFile({
			fileType: req.file.mimetype,
			fileName: req.file.originalname,
			size: req.file.size,
			referencedDocs: [doc.id],
			_id: req.file.id,
			...(req.body.credit ? { credit: JSON.parse(req.body.credit) } : {})
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
