const mongoose = require('mongoose');

const { Schema } = mongoose;

const tagSchema = new Schema({
	name: {
		type: String,
		required: true,
		lowercase: true,
		unique: true
	},
	blogs: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Blog'
		}
	]
}, {
	timestamps: true
});

// Transform output after converting it to JSON
tagSchema.set('toJSON', {
	versionKey: false,
	transform: function (_, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
	},
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;