const { default: mongoose } = require('mongoose');

const handlePagination = (req) => {
	const { page = 1, limit = 12 } = req.query;
	const skip = (Number(page) - 1) * Number(limit);
	return { skip, limit: Number(limit) };
};

const handleFiltering = (req, filters = []) => {
	const query = {};
	filters.forEach(filter => {
		if (req.query[filter]) {
			query[filter] = req.query[filter];
		}
	});

	if (req.query.excludeIds) {
		const idsToExclude = req.query.excludeIds.split(',')
			.map(id => mongoose.Types.ObjectId(id));
		query._id = { $nin: idsToExclude };
	}

	return query;
};

const handleSorting = (req, sorts = {}) => {
	if (req.query.sort && sorts[req.query.sort]) {
		return sorts[req.query.sort];
	}
	return {};
};

module.exports = {
	handlePagination,
	handleFiltering,
	handleSorting
};