const clearUploads = async (conn) => {
	const collections = await conn.db.listCollections().toArray();
	const collectionNames = collections.map(c => c.name);

	if (collectionNames.includes('fs.files')) {
		await conn.dropCollection('fs.files');
		console.log('Cleared fs.files');
	}

	if (collectionNames.includes('fs.chunks')) {
		await conn.dropCollection('fs.chunks');
		console.log('Cleared fs.chunks');
	}
};

module.exports = {
	clearUploads
};