const { default: mongoose } = require('mongoose');

const handlePagination = (req) => {
	const { page = 1, limit = 12 } = req.query;
	const skip = (Number(page) - 1) * Number(limit);
	return { skip, limit: Number(limit) };
};

const convertStringIdsToObjectIds = (filters, req) => {
	const query = {};
	filters.forEach(filter => {
		if (req.query[filter]) {
			if (filter === 'id') {
				query[filter] = new mongoose.Types.ObjectId(req.query[filter]);
			} else {
				query[filter] = req.query[filter];
			}
		}
	});
	return query;
};

const handleIds = (query, req) => {
	if (req.query.excludeIds) {
		const idsToExclude = req.query.excludeIds.split(',')
			.map(id => new mongoose.Types.ObjectId(id));
		query._id = { $nin: idsToExclude };
	}
	if (req.query.tags) {
		const idsToMatch = req.query.tags.split(',')
			.map(id => new mongoose.Types.ObjectId(id));
		query.tags = { $elemMatch: { $in: idsToMatch } };
	}

	return query;
};

const handleFiltering = (req, filters = []) => {
	let query = convertStringIdsToObjectIds(filters, req);
	query = handleIds(query, req);

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