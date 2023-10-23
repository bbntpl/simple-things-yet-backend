const mongoose = require('mongoose');

const imageFileSchema = new mongoose.Schema({
	fileName: {
		type: String,
		required: true,
	},
	fileType: {
		type: String,
		required: true,
	},
	size: {
		type: Number,
		required: true,
	},
	uploadDate: {
		type: Date,
		default: Date.now,
		required: true,
	},
	credit: {
		authorName: {
			type: String,
			default: null,
		},
		authorLink: {
			type: String,
			default: null,
		},
		sourceName: {
			type: String,
			default: null,
		},
		sourceLink: {
			type: String,
			default: null,
		},
	},
});

const ImageFile = mongoose.model('ImageFile', imageFileSchema);

module.exports = ImageFile;