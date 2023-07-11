
const mongoose = require('mongoose');
const slugify = require('slugify');

const { Schema } = mongoose;

const categorySchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		default: ''
	},
	slug: {
		type: String,
		unique: true
	},
	imageId: {
		type: String,
		required: false
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

categorySchema.pre('save', function (next) {
	// Only create slug if name is modified (or new)
	if (this.isModified('name')) {
		this.slug = slugify(this.name, { lower: true, strict: true });
	}
	next();
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