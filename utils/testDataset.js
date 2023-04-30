// Tests dataset

// Sample data for author populate
const authorDetails = {
	name: 'Random Author',
	bio: 'This is a random author bio.',
	email: 'first.author@example.com',
	password: 'testpassword'
};

exports.sampleAuthor1 = {
	username: 'randauthor',
	...authorDetails
}
exports.sampleAuthor2 = {
	username: 'randauthor2',
	...authorDetails
}

// Sample data for viewer populate
const viewerDetails = {
	name: 'testviewer',
	password: 'testpwd'
};

exports.sampleViewer1 = {
	username: 'testusername1',
	...viewerDetails
}
exports.sampleViewer2 = {
	username: 'testusername2',
	...viewerDetails
}

// Sample data for categorie populate
exports.sampleCategory1 = {
	name: 'technology',
	description: 'This area is about technologies and AIs'
}
exports.sampleCategory2 = {
	name: 'health',
	description: 'This area is how to maintain healthiness'
}

// Sample data for blog populate
exports.sampleBlog1 = {
	title: 'Test Blog',
	content: 'This is a test blog content',
}

exports.sampleBlog2 = {
	title: 'Hey Ya!',
	content: 'contentconentcotnenttentcon',
}

// Sample data for comment populate
exports.sampleComment1 = {
	content: 'What is the hidden meaning of this article?'
}

exports.sampleComment2 = {
	comment: 'So far, what\'s your main opinion on the latest major changes of that technology?',
}