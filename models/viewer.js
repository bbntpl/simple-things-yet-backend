const mongoose = require('mongoose');

const { Schema } = mongoose;

const viewerSchema = new Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	username: {
		type: String,
		unique: true,
		required: true,
		min: 4,
		max: 20,
		match: /^[a-zA-Z0-9]+$/,
	},
	passwordHash: {
		type: String,
		required: true,
		minlength: 8,
	},
	comments: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Comment',
		},
	],
}, {
	timestamps: true
});

// Transform output after converting it to JSON
viewerSchema.set('toJSON', {
	transform: function (_, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
		delete returnedObject.__v;
		delete returnedObject.passwordHash;
	},
});

const Viewer = mongoose.model('Viewer', viewerSchema);
module.exports = Viewer;
