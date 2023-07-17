const mongoose = require('mongoose');

let gfs;

function getGfs() {
	return new Promise((resolve, reject) => {
		if (gfs) {
			// immediately resolve existing gfs
			resolve(gfs);
		} else {
			// Establish GridFsBucket connection
			const conn = mongoose.connection;
			if (conn.readyState === 1) {
				console.log('Connection already open, creating new gfs');
				gfs = new mongoose.mongo.GridFSBucket(conn.db, {
					bucketName: 'uploads'
				});
				resolve(gfs);
			} else {
				console.log('Connection not open');
				reject(new Error('MongoDB connection not open'));
			}
		}
	});
}


module.exports = getGfs;