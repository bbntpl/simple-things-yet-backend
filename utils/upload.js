const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const { MONGODB_URI } = require('./config');
const url = MONGODB_URI;

const storage = new GridFsStorage({
	url,
	file: (req, file) => {
		if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
			return {
				bucketName: 'uploads'
			};
		} else {
			return null;
		}
	}
});

const upload = multer({ storage });

module.exports = upload;