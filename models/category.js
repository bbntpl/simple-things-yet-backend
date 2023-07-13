const mongoose = require('mongoose');
const slugify = require('slugify');

const { Schema } = mongoose;

const categorySchema = new Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	description: {
		type: String,
		default: ''
	},
	slug: {
		type: String,
	},
	imageId: {
		type: Schema.Types.ObjectId,
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

categorySchema.set('autoIndex', false);

// Allow name to be case insensitive
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

categorySchema.pre('save', function (next) {
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