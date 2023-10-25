const supertest = require('supertest');
const mongoose = require('mongoose');
const path = require('path');

const { app, initApp } = require('../app');
const {
	imageDocsInDb,
	loginAuthor,
	publishBlog,
	createCategoryWithImage
} = require('../utils/tests/helpers');
const {
	sampleAuthor1,
	sampleImageCredit,
	sampleBlog1,
	sampleCategory1
} = require('../utils/tests/dataset');
const clearUploads = require('../utils/clearUploads');
const ImageFile = require('../models/image-file');

let token;
let server;
const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
});

beforeEach(async () => {
	await ImageFile.deleteMany({});
	await clearUploads(mongoose.connection);

	token = null;
	token = await loginAuthor(request, sampleAuthor1);
});

const getImageFileDocs = async () => {
	return await request.get('/api/images/docs')
		.expect('Content-Type', /application\/json/)
		.expect(200);
};

const getImageFileDoc = async (imageDocId) => {
	return await request
		.get(`/api/images/${imageDocId}/doc`)
		.expect('Content-Type', /application\/json/)
		.expect(200);
};

// const getImage = async (imageId) => {
// 	return await request.get(`/api/images/${imageId}`)
// 		.expect('Content-Type', /application\/json/)
// 		.expect(200);
// };

const createImageDoc = async (imagePath, values = {}) => {
	const uploadImageResponse = await request
		.post('/api/images/upload')
		.attach('uploadImage', imagePath, { filename: 'image.png' })
		.field('credit', values)
		.set('Authorization', `Bearer ${token}`)
		.expect(200);

	return uploadImageResponse;
};

const deleteImageDoc = async (imageDocId) => {
	const deletedImageResponse = await request
		.delete(`/api/images/${imageDocId}/doc`)
		.set('Authorization', `Bearer ${token}`)
		.expect(204);

	return deletedImageResponse;
};

describe('fetching image file documents', () => {
	test('should return image file docs as json', async () => {
		const imageFileDocs = await getImageFileDocs();
		const initialImageFileDoc = imageFileDocs.body[0];

		expect(initialImageFileDoc.fileName).not.toBeUndefined();
		expect(initialImageFileDoc.fileType).not.toBeUndefined();
		expect(initialImageFileDoc.size).not.toBeUndefined();
	});

	test('should get a specific image file doc', async () => {
		const imageDoc = (await imageDocsInDb())[0];
		const fetchedImageDoc = await getImageFileDoc(imageDoc.id);

		expect(fetchedImageDoc.body.fileName).toEqual(imageDoc.fileName);
		expect(fetchedImageDoc.body.fileType).toEqual(imageDoc.fileType);
		expect(fetchedImageDoc.body.size).toEqual(imageDoc.size);
	});
});

describe('creation of image file doc', () => {
	beforeEach(async () => {
		token = null;
		token = await loginAuthor(request, sampleAuthor1);
	});

	test('should have valid image file doc by uploading it directly', () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = createImageDoc(filePath);

		expect(uploadResponse.body.fileName).toEqual('image.png');
		expect(uploadResponse.body.fileType).toEqual('image/png');
		expect(uploadResponse.body.size).toMatch(/^[0-9]+/);
	});

	test('should have valid document by uploading it as blog image', async () => {
		const newBlog = await publishBlog(request, {
			blog: sampleBlog1,
			token
		});
		expect(newBlog.body.imageFile).toBeDefined();

		const fetchedBlogImage = await getImageFileDoc(newBlog.body.imageFile);
		expect(fetchedBlogImage.body).toHaveProperty([
			'id', 'size', 'fileName', 'fileType'
		]);
		expect(fetchedBlogImage.body.id).toEqual(newBlog.body.imageFile);
	});

	test('should have valid document by uploading it as category image', async () => {
		const newCategory = await createCategoryWithImage(request, sampleCategory1);
		expect(newCategory.body.imageFile).toBeDefined();

		const fetchedCategoryImage = await getImageFileDoc(newCategory.body.imageFile);
		expect(fetchedCategoryImage.body).toHaveProperty([
			'id', 'size', 'fileName', 'fileType'
		]);
		expect(fetchedCategoryImage.body.id).toEqual(newCategory.body.imageFile);
	});

	test('should have valid document by uploading it as author image', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');

		const updatedAuthorResponse = await request
			.put('/api/author/update/image')
			.attach('authorImage', filePath, { filename: 'image.png' })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);
		expect(updatedAuthorResponse.body.imageFile).toBeDefined();

		const fetchedAuthorImage = await getImageFileDoc(updatedAuthorResponse.body.imageFile);
		expect(fetchedAuthorImage.body.imageFile).toHaveProperty([
			'id', 'size', 'fileName', 'fileType'
		]);
		expect(fetchedAuthorImage.body.id).toEqual(updatedAuthorResponse.body.imageFile);
	});

	test('should have valid optional values by uploading it if added manually', () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = createImageDoc(filePath, sampleImageCredit);

		expect(uploadResponse.body.fileName).toEqual('image.png');
		expect(uploadResponse.body.fileType).toEqual('image/png');
		expect(uploadResponse.body.size).toMatch(/^[0-9]+/);
		expect(uploadResponse.body.authorName).toEqual(sampleImageCredit.authorName);
		expect(uploadResponse.body.authorLink).toEqual(sampleImageCredit.authorLink);
		expect(uploadResponse.body.sourceName).toEqual(sampleImageCredit.sourceName);
		expect(uploadResponse.body.sourceLink).toEqual(sampleImageCredit.sourceLink);
	});
});

describe('deletion of image file doc', () => {
	test('should delete a single blog', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		await createImageDoc(filePath);

		const imageFileDocsAtStart = await getImageFileDocs();
		expect(imageFileDocsAtStart.body).toHaveLength(1);

		await deleteImageDoc(imageFileDocsAtStart.body[0].id);

		const imageFileDocsAtEnd = await getImageFileDocs();
		expect(imageFileDocsAtEnd.body).toHaveLength(0);
	});

	test('should successfully remove the image from blog document', async () => {
		const newBlog = await publishBlog(request, {
			blog: sampleBlog1, token
		});

		const imageFileDocsAtStart = await getImageFileDocs();
		expect(imageFileDocsAtStart.body).toHaveLength(1);

		await deleteImageDoc(imageFileDocsAtStart.body[0].id);

		const imageFileDocsAtEnd = await getImageFileDocs();
		expect(imageFileDocsAtEnd.body).toHaveLength(0);

		const blogFetchResponse = await request
			.get(`/api/blogs/${newBlog.body.id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);
		expect(blogFetchResponse.body.imageFile).toEqual(null);
	});

	test('should successfully remove the image from author document', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');

		await request
			.put('/api/author/update/image')
			.attach('authorImage', filePath, { filename: 'image.png' })
			.set('Authorization', `Bearer ${token}`)
			.expect(200);

		const imageFileDocsAtStart = await getImageFileDocs();
		expect(imageFileDocsAtStart.body).toHaveLength(1);

		await deleteImageDoc(imageFileDocsAtStart.body[0].id);

		const imageFileDocsAtEnd = await getImageFileDocs();
		expect(imageFileDocsAtEnd.body).toHaveLength(0);

		const authorInfoFetchResponse = await request
			.get('/api/author/info')
			.expect('Content-Type', /application\/json/)
			.expect(200);
		expect(authorInfoFetchResponse.body.imageFile).toEqual(null);
	});

	test('should successfully remove the image from category document', async () => {
		const newCategory = await createCategoryWithImage(request, sampleCategory1);

		const imageFileDocsAtStart = await getImageFileDocs();
		expect(imageFileDocsAtStart.body).toHaveLength(1);

		await deleteImageDoc(imageFileDocsAtStart.body[0].id);

		const imageFileDocsAtEnd = await getImageFileDocs();
		expect(imageFileDocsAtEnd.body).toHaveLength(0);

		const categoryFetchResponse = await request
			.get(`/api/categories/${newCategory.body.id}`)
			.expect('Content-Type', /application\/json/)
			.expect(200);
		expect(categoryFetchResponse.body.imageFile).toEqual(null);
	});
});

afterAll(async () => {
	await mongoose.connection.close();
	server.close();
	console.log('Image Docs Tests: Close the server');
});