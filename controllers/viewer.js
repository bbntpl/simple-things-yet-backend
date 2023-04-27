exports.viewerRegister = async (req, res) => {
  res.json({ message: 'POST - viewer register' });
};

exports.viewerLogin = async (req, res) => {
  res.json({ message: 'POST - viewer login' });
};

exports.viewerFetch = async (req, res) => {
  res.json({ message: 'GET - viewer fetch' });
};

exports.viewers = async (req, res) => {
  res.json({ message: 'GET - viewers fetch' });
};

exports.viewerUpdate = async (req, res) => {
  res.json({ message: 'PUT - viewer update' });
};

exports.viewerDelete = async (req, res) => {
  res.json({ message: 'DELETE - viewer delete' });
};