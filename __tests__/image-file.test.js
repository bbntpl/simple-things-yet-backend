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
	sampleCategory1,
	sampleInvalidImageCredit
} = require('../utils/tests/dataset');
const clearUploads = require('../utils/clearUploads');
const { hasImageInGridFS } = require('../controllers/reusables');
const ImageFile = require('../models/image-file');
const Blog = require('../models/blog');
const Category = require('../models/category');

let token;
let server;
const request = supertest(app);

beforeAll(async () => {
	server = await initApp();
	token = await loginAuthor(request, sampleAuthor1);
});

beforeEach(async () => {
	await ImageFile.deleteMany({});
	await Blog.deleteMany({});
	await Category.deleteMany({});
	await clearUploads(mongoose.connection);
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

const createImageDoc = async (imagePath, values = {}) => {
	const stringifiedValues = JSON.stringify(values);
	const uploadImageResponse = await request
		.post('/api/images/upload')
		.attach('uploadImage', imagePath, { filename: 'image.png' })
		.field('credit', stringifiedValues)
		.set('Authorization', `Bearer ${token}`)
		.expect(201);

	return uploadImageResponse;
};


const updateImageDoc = async (imageId, values = {}) => {
	const stringifiedValues = JSON.stringify(values);
	const uploadImageResponse = await request
		.put(`/api/images/${imageId}/update`)
		.send({
			credit: stringifiedValues,
		})
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
	beforeEach(async () => {
		await ImageFile.deleteMany({});
		await clearUploads(mongoose.connection);

		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		await createImageDoc(filePath);
	});

	test('should return image file docs as json', async () => {
		const imageFileDocs = await getImageFileDocs();
		const initialImageFileDoc = imageFileDocs.body[0];

		expect(typeof initialImageFileDoc.fileName).toBe('string');
		expect(typeof initialImageFileDoc.fileType).toBe('string');
		expect(typeof initialImageFileDoc.size).toBe('number');
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
	test('should have valid image file doc by uploading it directly', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = await createImageDoc(filePath);

		expect(uploadResponse.body.fileName).toEqual('image.png');
		expect(uploadResponse.body.fileType).toEqual('image/png');
		expect(typeof uploadResponse.body.size).toBe('number');
		expect(uploadResponse.body.referencedDocs).toHaveLength(0);
	});

	test('should have its chunks and file uploaded to DB', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = await createImageDoc(filePath);

		const isThereAnImageFromDb = hasImageInGridFS(uploadResponse.body.id);
		expect(isThereAnImageFromDb).toBeTruthy();
	});

	test('should have valid document by uploading it as blog image', async () => {
		const newBlog = await publishBlog(request, {
			blog: sampleBlog1,
			token
		});
		expect(newBlog.body.imageFile).toBeDefined();
		const fetchedBlogImage = await getImageFileDoc(newBlog.body.imageFile);

		expect(fetchedBlogImage.body.referencedDocs).toHaveLength(1);
		expect(fetchedBlogImage.body.referencedDocs).toContain(newBlog.body.id);
		expect(fetchedBlogImage.body.id).toEqual(newBlog.body.imageFile);
	});

	test('should have valid document by uploading it as category image', async () => {
		const newCategory = await createCategoryWithImage(request, {
			category: sampleCategory1,
			token
		});
		expect(newCategory.body.imageFile).toBeDefined();

		const fetchedCategoryImage = await getImageFileDoc(newCategory.body.imageFile);

		expect(fetchedCategoryImage.body.referencedDocs).toHaveLength(1);
		expect(fetchedCategoryImage.body.referencedDocs).toContain(newCategory.body.id);
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
		expect(fetchedAuthorImage.body.imageFile).not.toEqual(null);
		expect(fetchedAuthorImage.body.referencedDocs).toHaveLength(1);
		expect(fetchedAuthorImage.body.referencedDocs).toContain(updatedAuthorResponse.body.id);
		expect(fetchedAuthorImage.body.id).toEqual(updatedAuthorResponse.body.imageFile);
	});

	test('should have valid optional values by uploading it if added manually', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = await createImageDoc(filePath, sampleImageCredit);
		const credit = uploadResponse.body.credit;

		expect(uploadResponse.body.fileName).toEqual('image.png');
		expect(uploadResponse.body.fileType).toEqual('image/png');
		expect(typeof uploadResponse.body.size).toBe('number');
		expect(credit.authorName).toEqual(sampleImageCredit.authorName);
		expect(credit.authorURL).toEqual(sampleImageCredit.authorURL);
		expect(credit.sourceName).toEqual(sampleImageCredit.sourceName);
		expect(credit.sourceURL).toEqual(sampleImageCredit.sourceURL);
	});

	test('should respond with 400 if credit values are invalid', async () => {
		const imagePath = path.join(__dirname, '../images/dbdiagram.png');

		const stringifiedValues = JSON.stringify(sampleInvalidImageCredit);
		const uploadImageResponse = await request
			.post('/api/images/upload')
			.attach('uploadImage', imagePath, { filename: 'image.png' })
			.field('credit', stringifiedValues)
			.set('Authorization', `Bearer ${token}`)
			.expect(400);


		expect(uploadImageResponse.body.errors).toBeDefined();
		expect(uploadImageResponse.body.errors).toHaveLength(4);
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


	test('should have its chunks and file deleted from DB', async () => {
		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		const uploadResponse = await createImageDoc(filePath);

		const imageFileDocsAtStart = await getImageFileDocs();
		expect(imageFileDocsAtStart.body).toHaveLength(1);

		await deleteImageDoc(imageFileDocsAtStart.body[0].id);

		const imageFileDocsAtEnd = await getImageFileDocs();
		expect(imageFileDocsAtEnd.body).toHaveLength(0);

		await expect(hasImageInGridFS(uploadResponse.body.id))
			.resolves.toBeFalsy();
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
		const newCategory = await createCategoryWithImage(request, {
			category: sampleCategory1,
			token
		});

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

describe('update of image file doc', () => {
	beforeEach(async () => {
		await ImageFile.deleteMany({});
		await clearUploads(mongoose.connection);

		const filePath = path.join(__dirname, '../images/dbdiagram.png');
		await createImageDoc(filePath, sampleImageCredit);
	});

	test('should respond with 400 after receiving invalid values for credit info', async () => {
		const imageFileDocsAtStart = await getImageFileDocs();
		const initialImageFileDoc = imageFileDocsAtStart.body[0];

		const stringifiedValues = JSON.stringify(sampleInvalidImageCredit);

		const updateResponse = await request
			.put(`/api/images/${initialImageFileDoc.id}/update`)
			.send({
				credit: stringifiedValues,
			})
			.set('Authorization', `Bearer ${token}`)
			.expect(400);

		expect(updateResponse.body.errors).toBeDefined();
		expect(updateResponse.body.errors).toHaveLength(4);
	});

	test('should successfully update credit info', async () => {
		const imageFileDocsAtStart = await getImageFileDocs();
		const initialImageFileDoc = imageFileDocsAtStart.body[0];
		const newCreditInfo = {
			sourceName: 'hola mama',
			authorName: 'chao chao',
			sourceURL: 'https://holamama.com',
			authorURL: 'https://chaochao.net'
		};

		const updateResponse = await updateImageDoc(
			initialImageFileDoc.id,
			newCreditInfo
		);

		expect(updateResponse.body.credit).toMatchObject(newCreditInfo);
	});
});

afterAll(async () => {
	await mongoose.connection.close();
	server.close();
	console.log('Image Docs Tests: Close the server');
});