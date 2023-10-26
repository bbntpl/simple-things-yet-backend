const clearUploads = async (conn) => {
	const collections = await conn.db.listCollections().toArray();
	const collectionNames = collections.map(c => c.name);

	if (collectionNames.includes('uploads.files')) {
		await conn.dropCollection('uploads.files');
	}

	if (collectionNames.includes('uploads.chunks')) {
		await conn.dropCollection('uploads.chunks');
	}
};

module.exports = clearUploads;