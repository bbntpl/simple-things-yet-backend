const mongoose = require('mongoose');

let gfs;

function getGfs() {
	return new Promise((resolve, reject) => {
		if (gfs) {
			// Immediately resolve existing gfs
			resolve(gfs);
		} else {
			// Establish GridFsBucket connection
			const conn = mongoose.connection;
			if (conn.readyState === 1) {
				gfs = new mongoose.mongo.GridFSBucket(conn.db, {
					bucketName: 'uploads'
				});
				resolve(gfs);
			} else {
				reject(new Error('MongoDB connection not open'));
			}
		}
	});
}

module.exports = getGfs;