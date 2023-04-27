exports.commentCreate = async (req, res) => {
  res.json({ message: 'POST - comment create' });
};

exports.comments = async (req, res) => {
  res.json({ message: 'GET - comments fetch' });
};

exports.commentFetch = async (req, res) => {
  res.json({ message: 'GET - comment fetch' });
};

exports.commentUpdate = async (req, res) => {
  res.json({ message: 'PUT - comment update' });
};

exports.commentDelete = async (req, res) => {
  res.json({ message: 'DELETE - comment delete' });
};
