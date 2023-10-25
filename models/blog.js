const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const { Schema } = mongoose;

const blogSchema = new Schema({
	title: {
		type: String,
		required: true,
		unique: true,
	},
	slug: {
		type: String,
		unique: true,
	},
	content: {
		type: String,
		required: true
	},
	author: {
		type: Schema.Types.ObjectId,
		ref: 'Author'
	},
	imageFile: {
		type: Schema.Types.ObjectId,
		ref: 'ImageFile',
		default: null
	},
	likes: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Viewer'
		}
	],
	isPublished: {
		type: Boolean,
		default: false
	},
	publishedAt: Schema.Types.Date,
	comments: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Comment'
		}
	],
	category: {
		type: Schema.Types.ObjectId,
		ref: 'Category',
		default: null
	},
	tags: [
		{
			type: Schema.Types.ObjectId,
			ref: 'Tag'
		}
	],
	isPrivate: {
		type: Boolean,
		default: true
	}
}, {
	timestamps: true
});

blogSchema.pre('save', function (next) {
	if (this.isPublished && !this.publishedAt) {
		this.set({ publishedAt: new Date() });
	}

	if (this.isModified('title')) {
		this.slug = slugify(this.title, { lower: true, strict: true });
	}

	next();
});

// Transform output after converting it to JSON
blogSchema.set('toJSON', {
	versionKey: false,
	transform: function (_, returnedObject) {
		returnedObject.id = returnedObject._id.toString();
		delete returnedObject._id;
	},
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;