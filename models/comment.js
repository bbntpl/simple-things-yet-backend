const mongoose = require('mongoose');

const { Schema } = mongoose;

const commentSchema = new Schema({
	content: {
		type: String,
		required: true,
		min: 1,
		max: 800,
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
	author: {
		type: Schema.Types.ObjectId,
		ref: 'Author',
		default: null,
		validate: {
			validator: function() {
				return this.author !== null || this.viewer !== null;
			},
			message: 'Either author or viewer must be the user'
		}
	},
	viewer: {
		type: Schema.Types.ObjectId,
		ref: 'Viewer',
		default: null,
		validate: {
			validator: function() {
				return this.author !== null || this.viewer !== null;
			},
			message: 'Either author or viewer must be the user'
		}
	},
	blog: {
		required: true,
		type: Schema.Types.ObjectId,
		ref: 'Blog'
	},
	parentComment: {
		type: Schema.Types.ObjectId,
		default: null,
		ref: 'Comment',
	},
	replies: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Comment'
		}
	]
});

commentSchema.pre('findOneAndUpdate', function (next) {
	this.set({ updatedAt: new Date() });
	next();
});

// Transform output after converting it to JSON
commentSchema.set('toJSON', {
	versionKey: false,
	transform: function (_doc, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
	},
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;