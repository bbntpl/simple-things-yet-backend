const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const { Schema } = mongoose;

const tagSchema = new Schema({
	name: {
		type: String,
		required: true,
		lowercase: true,
		unique: true
	},
	slug: {
		type: String,
		unique: true,
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

tagSchema.pre('save', function (next) {
	if (this.isModified('name')) {
		this.slug = slugify(this.name, { lower: true, strict: true });
	}
	next();
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