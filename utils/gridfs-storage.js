const { GridFsStorage } = require('multer-gridfs-storage');

const { MONGODB_URI } = require('./config');
const url = MONGODB_URI;

exports.storageForImages = new GridFsStorage({
	url,
	file: (_req, file) => {
		if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
			return { bucketName: 'uploads' };
		}
		return null;
	}
});