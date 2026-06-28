import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { awardXpCoins, awardCoins, ACHIEVEMENT_COIN_BONUS } from '../economy.js';
import { formatProfile as fmt } from '../profile.js';

const router = Router();

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
  const before = db.prepare('SELECT totalXP FROM player_profiles WHERE userId=?').get(req.userId);
  db.prepare('UPDATE player_profiles SET totalXP = totalXP + ?, updatedAt = ? WHERE userId = ?')
    .run(amount, now, req.userId);
  // Award coins (XP trickle + level-up bonus)
  const coinsAwarded = awardXpCoins(db, req.userId, before?.totalXP ?? 0, amount);
  // Log activity
  db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,createdAt) VALUES (?,?,?,?,?,?,?)')
    .run(uuid(), req.userId, 'xp_gain', reason || 'XP awarded', amount, coinsAwarded, now);
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
    // Achievement coin bonus
    const bonus = awardCoins(db, req.userId, ACHIEVEMENT_COIN_BONUS);
    db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,relatedId,createdAt) VALUES (?,?,?,?,?,?,?,?)')
      .run(uuid(), req.userId, 'achievement', `Logro: ${achievementId}`, 0, bonus, achievementId, now);
  }
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

const MAX_CATEGORIES = 30;

// PUT /api/player/recommended-hours — save the global hours-distribution plan.
// Categories are now user-defined, so keys are dynamic ids; we only sanitize values.
router.put('/recommended-hours', requireAuth, (req, res) => {
  const db = getDb();
  const incoming = req.body?.recommendedHours ?? req.body ?? {};
  const clean = {};
  for (const [key, raw] of Object.entries(incoming)) {
    if (Object.keys(clean).length >= MAX_CATEGORIES) break;
    if (typeof key !== 'string' || !key) continue;
    const v = Number(raw);
    if (Number.isFinite(v) && v > 0) clean[key.slice(0, 40)] = Math.min(24, Math.round(v * 2) / 2); // snap 30 min
  }
  const p = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  db.prepare('UPDATE player_profiles SET recommendedHours = ?, updatedAt = ? WHERE userId = ?')
    .run(JSON.stringify(clean), new Date().toISOString(), req.userId);
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

// PUT /api/player/time-categories — save the user's custom category list
router.put('/time-categories', requireAuth, (req, res) => {
  const db = getDb();
  const incoming = Array.isArray(req.body?.timeCategories) ? req.body.timeCategories : [];
  const seen = new Set();
  const clean = [];
  for (const c of incoming) {
    if (clean.length >= MAX_CATEGORIES) break;
    const id    = String(c?.id ?? '').slice(0, 40).trim();
    const label = String(c?.label ?? '').slice(0, 40).trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const color = /^#[0-9a-fA-F]{6}$/.test(c?.color) ? c.color : '#888888';
    const icon  = String(c?.icon ?? '').slice(0, 4);
    clean.push({ id, label, color, icon });
  }
  const p = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  if (!p) return res.status(404).json({ error: 'Profile not found' });
  db.prepare('UPDATE player_profiles SET timeCategories = ?, updatedAt = ? WHERE userId = ?')
    .run(JSON.stringify(clean), new Date().toISOString(), req.userId);
  const updated = db.prepare('SELECT * FROM player_profiles WHERE userId = ?').get(req.userId);
  res.json(fmt(updated));
});

export default router;
