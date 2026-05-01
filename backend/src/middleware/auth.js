const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const tokenHeader = req.headers['authorization'];
  if (!tokenHeader) {
    return res.status(403).json({ error: 'No token provided' });
  }

  const token = tokenHeader.split(' ')[1];
  if (!token) {
    return res.status(403).json({ error: 'Malformed token' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.hostelUsername = decoded.hostel_unique_username;
    next();
  });
};

const verifyOwnerRole = (req, res, next) => {
  if (req.userRole !== 'OWNER') {
    return res.status(403).json({ error: 'Require Owner Role' });
  }
  next();
};

const verifyTenantRole = (req, res, next) => {
  if (req.userRole !== 'TENANT') {
    return res.status(403).json({ error: 'Require Tenant Role' });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyOwnerRole,
  verifyTenantRole
};
