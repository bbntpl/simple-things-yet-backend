const { default: mongoose } = require('mongoose');

const handlePagination = (req) => {
	const { page = 1, limit = 20 } = req.query;
	const skip = (Number(page) - 1) * Number(limit);
	return { skip, limit: Number(limit) };
};

const convertStringIdsToObjectIds = (filters, req) => {
	const query = {};
	filters.forEach(filter => {
		if (req.query[filter]) {
			if (filter === 'id') {
				query[filter] = mongoose.Types.ObjectId(req.query[filter]);
			} else {
				query[filter] = req.query[filter];
			}
		}
	});
	return query;
};

const handleExcludedIds = (query, req) => {
	if (req.query.excludeIds) {
		const idsToExclude = req.query.excludeIds.split(',')
			.map(id => mongoose.Types.ObjectId(id));
		query.id = { $nin: idsToExclude };
	}
	return query;
};

const handleFiltering = (req, filters = []) => {
	let query = convertStringIdsToObjectIds(filters, req);
	query = handleExcludedIds(query, req);
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