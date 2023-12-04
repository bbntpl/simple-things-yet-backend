const { connectDB } = require('../db');
const { PORT } = require('../utils/config');

function initApp(app) {
	try {
		connectDB();
		const server = app.listen(PORT, function (err) {
			if (err) {
				console.log(`Error: ${err}`);
			}
			console.log(`App is connected to port ${PORT}`);
		});

		return server;
	} catch (err) {
		console.log(`Error: ${err}`);
	}
}

module.exports = { initApp };