const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const { MONGODB_URI } = require('./config');
const url = MONGODB_URI;

const storage = new GridFsStorage({ url });
const upload = multer({ storage });

module.exports = upload;