import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function fmt(p) {
  if (!p) return null;
  return {
    ...p,
    unlockedAchievements: typeof p.unlockedAchievements === 'string'
      ? JSON.parse(p.unlockedAchievements) : p.unlockedAchievements
  };
}

// GET /api/player
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(fmt(profile));
});

// PATCH /api/player
router.patch('/', requireAuth, (req, res) => {
  const db = getDb();
  const { displayName, totalXP, streak, lastActiveDate } = req.body;
  const p = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  const now = new Date().toISOString();
  db.prepare('UPDATE player_profiles SET displayName=?, totalXP=?, streak=?, lastActiveDate=?, updatedAt=? WHERE userId=?')
    .run(displayName??p.displayName, totalXP??p.totalXP, streak??p.streak, lastActiveDate??p.lastActiveDate, now, req.userId);
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

// POST /api/player/xp — award XP to player
router.post('/xp', requireAuth, (req, res) => {
  const db = getDb();
  const { amount, reason } = req.body;
  if (!amount || amount < 0) return res.status(400).json({ error: 'Invalid XP amount' });
  const now = new Date().toISOString();
  db.prepare('UPDATE player_profiles SET totalXP = totalXP + ?, updatedAt = ? WHERE userId = ?')
    .run(amount, now, req.userId);
  // Log activity
  
  db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,createdAt) VALUES (?,?,?,?,?,?)')
    .run(uuid(), req.userId, 'xp_gain', reason || 'XP awarded', amount, now);
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

// POST /api/player/achievements
router.post('/achievements', requireAuth, (req, res) => {
  const db = getDb();
  const { achievementId } = req.body;
  const p = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  const list = typeof p.unlockedAchievements === 'string'
    ? JSON.parse(p.unlockedAchievements) : p.unlockedAchievements;
  if (!list.includes(achievementId)) {
    list.push(achievementId);
    const now = new Date().toISOString();
    db.prepare('UPDATE player_profiles SET unlockedAchievements = ?, updatedAt = ? WHERE userId = ?')
      .run(JSON.stringify(list), now, req.userId);
  }
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

export default router;
