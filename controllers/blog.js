exports.blogCreate = async (req, res) => {
  res.json({ message: 'POST - blog create' });
};

exports.blogs = async (req, res) => {
  res.json({ message: 'GET - blogs fetch' });
};

exports.blogFetch = async (req, res) => {
  res.json({ message: 'GET - blog fetch' });
};

exports.blogUpdate = async (req, res) => {
  res.json({ message: 'PUT - blog update' });
};

exports.blogDelete = async (req, res) => {
  res.json({ message: 'DELETE - blog delete' });
};