// Tests dataset

const { default: mongoose } = require('mongoose');

// For more context: test data objects that has 1 in its name are the default ones
// Sample data for author populate
const mockImageId = new mongoose.Types.ObjectId();

const authorDetails = {
	name: 'Random Author',
	bio: 'This is a random author bio.',
	email: 'first.author@gmail.com',
	password: 'testpassword456',
	imageId: mockImageId,
};

exports.sampleAuthor1 = {
	username: 'randauthor1',
	...authorDetails
};
exports.sampleAuthor2 = {
	username: 'randauthor2',
	...authorDetails
};

// Sample data for viewer populate
const viewerDetails = {
	name: 'testviewer',
	password: 'testpassword123'
};

exports.sampleViewer1 = {
	username: 'testusername1',
	...viewerDetails
};
exports.sampleViewer2 = {
	username: 'testusername2',
	...viewerDetails
};

// Sample data for categorie populate
exports.sampleCategory1 = {
	name: 'Technology',
	description: 'This area is about technologies and AIs',
	imageId: mockImageId
};
exports.sampleCategory2 = {
	name: 'Mental Health',
	description: 'This area is about mental health maintenance',
	imageId: mockImageId
};

// Sample data for categorie populate
exports.sampleTag1 = {
	name: 'reverse engineering',
};

exports.sampleTag2 = {
	name: 'hardcore diet',
};


// Sample data for blog populate
exports.sampleBlog1 = {
	title: 'Test Blog',
	content: 'This is a test blog content',
	imageId: mockImageId
};

exports.sampleBlog2 = {
	title: 'Hey Ya!',
	content: 'contentconentcotnenttentcon',
	imageId: mockImageId
};

// Sample data for comment populate
exports.sampleComment1 = {
	content: 'What is the hidden meaning of this article?'
};

exports.sampleComment2 = {
	content: 'So far, what\'s your main opinion on the latest major changes of that technology?',
};