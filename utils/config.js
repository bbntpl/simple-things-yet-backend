require('dotenv').config();

const {
	SECRET_KEY,
	PORT,
	NODE_ENV
} = process.env;

const AUTHOR_TOKEN_EXPIRATION_MS = '2d';
const USER_TOKEN_EXPIRATION_MS = '5d';
const MONGODB_URI = process.env.NODE_ENV === 'test'
	? process.env.TEST_MONGODB_URI
	: process.env.NODE_ENV === 'development'
		? process.env.DEV_MONGODB_URI
		: process.env.MONGODB_URI;

module.exports = {
	MONGODB_URI,
	SECRET_KEY,
	PORT,
	NODE_ENV,
	AUTHOR_TOKEN_EXPIRATION_MS,
	USER_TOKEN_EXPIRATION_MS
};