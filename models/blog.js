const mongoose = require('mongoose');

const { Schema } = mongoose;

const blogSchema = new Schema({
	title: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true
	},
	author: {
		type: Schema.Types.ObjectId,
		ref: 'Author'
	},
	likes: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Viewer'
		}
	],
	createdAt: {
		type: Schema.Types.Date,
		default: Date.now
	},
	updatedAt: {
		type: Schema.Types.Date,
		default: Date.now
	},
	comments: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Comment'
		}
	],
	categories: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Category'
		}
	],
	private: {
		type: Boolean,
		default: true
	}
})

blogSchema.pre('findOneAndUpdate', function (next) {
	this.set({ updatedAt: new Date() });
	next();
});

// Transform output after converting it to JSON
blogSchema.set('toJSON', {
	versionKey: false,
	transform: function (_, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
	},
})

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;