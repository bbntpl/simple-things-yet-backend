const { default: mongoose } = require('mongoose');
const getGfs = require('../../utils/gfs');

exports.resourceImageFetch = async (req, res, next) => {
	const { id } = req.params;
	try {
		const objectId = new mongoose.Types.ObjectId(id);
		const gfs = await getGfs();
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
		console.log('Error', err);
		next(err);
	}
};