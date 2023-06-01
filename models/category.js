const mongoose = require('mongoose');

const { Schema } = mongoose;

const categorySchema = new Schema({
	name: {
		type: String,
		required: true,
		lowercase: true
	},
	description: {
		type: String,
		default: ''
	},
	blogs: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Blog'
		}
	]
});

// Transform output after converting it to JSON
categorySchema.set('toJSON', {
	versionKey: false,
	transform: function (_, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
	},
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;