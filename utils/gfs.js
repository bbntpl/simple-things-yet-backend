const mongoose = require('mongoose');

let gfs;

function getGfs() {
	return new Promise((resolve, reject) => {
		if (gfs) {
			resolve(gfs);
		} else {
			// Establish GridFsBucket connection
			const conn = mongoose.connection;
			conn.once('open', () => {
				gfs = new mongoose.mongo.GridFSBucket(conn.db, {
					bucketName: 'fs'
				});
				resolve(gfs);
			});
			conn.on('error', (err) => {
				reject(err);
			});
		}
	});
}

module.exports = getGfs;