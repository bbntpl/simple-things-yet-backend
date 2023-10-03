const handlePagination = (req) => {
	const { page = 1, limit = 8 } = req.query;
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