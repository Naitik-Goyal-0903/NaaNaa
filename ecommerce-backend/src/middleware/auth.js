const jwt = require('jsonwebtoken');
const User = require('../models/User');

const extractBearerToken = (header) => {
  if (typeof header !== 'string') return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

const looksLikeJwt = (token) => typeof token === 'string' && token.split('.').length === 3;

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ msg: 'No token' });

  const token = extractBearerToken(header);
  if (!token) return res.status(401).json({ msg: 'Malformed authorization header' });
  if (!looksLikeJwt(token)) return res.status(401).json({ msg: 'Malformed token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.userId = decoded.id;
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(401).json({ msg: 'Invalid token' });
    req.user = user;
    next();
  } catch (err) {
    if (err?.name !== 'TokenExpiredError' && err?.name !== 'JsonWebTokenError') {
      console.error('JWT verify error:', err.message);
    }
    res.status(401).json({ msg: 'Token invalid' });
  }
};

module.exports = auth;
