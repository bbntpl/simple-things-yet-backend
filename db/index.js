const mongoose = require('mongoose');
const { MONGODB_URI } = require('../utils/config');

async function connectDB() {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log('Connected to MongoDB');
	} catch (error) {
		console.log(`Error connecting to MongoDB: ${error}`);
	}
}

module.exports = { connectDB };