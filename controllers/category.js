exports.categoryCreate = async (req, res) => {
  res.json({ message: 'POST - category create' });
};

exports.categories = async (req, res) => {
  res.json({ message: 'GET - categories fetch' });
};

exports.categoryFetch = async (req, res) => {
  res.json({ message: 'GET - category fetch' });
};

exports.categoryUpdate = async (req, res) => {
  res.json({ message: 'PUT - category update' });
};

exports.categoryDelete = async (req, res) => {
  res.json({ message: 'DELETE - category delete' });
};