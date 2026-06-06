import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'anton-rpg-dev-secret-change-in-prod';

export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const db = getDb();
    const now = new Date().toISOString();
    // Compare ISO strings directly (both are stored as ISO 8601)
    const session = db.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expiresAt > ?'
    ).get(token, now);
    if (!session) return res.status(401).json({ error: 'Session expired' });
    req.userId = payload.userId;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
