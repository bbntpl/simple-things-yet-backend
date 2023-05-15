require('dotenv').config();

const {
	SECRET_KEY,
	PORT,
	NODE_ENV
} = process.env;

const MONGODB_URI = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
	? process.env.TEST_MONGODB_URI
	: process.env.MONGODB_URI;
	
module.exports = {
	MONGODB_URI,
	SECRET_KEY,
	PORT,
	NODE_ENV
};