import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { awardXpCoins } from '../economy.js';
import { rollLoot } from '../data/cosmetics.js';

const LOOT_DROP_CHANCE = 0.08; // ~8% chance for a cosmetic to drop on quest completion

// ── SKILLS ────────────────────────────────────────────────────────────────────
export const skillsRouter = Router();

skillsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const skills = db.prepare('SELECT * FROM skills WHERE userId = ? ORDER BY xp DESC').all(req.userId);
  res.json(skills.map(s => ({ ...s, resources: JSON.parse(s.resources || '[]') })));
});

skillsRouter.post('/', requireAuth, (req, res) => {
  const { name, category, notes, resources } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
  const db = getDb(); const now = new Date().toISOString(); const id = uuid();
  db.prepare('INSERT INTO skills (id,userId,name,category,xp,notes,resources,createdAt,updatedAt) VALUES (?,?,?,?,0,?,?,?,?)')
    .run(id, req.userId, name.trim(), category||'Tech', notes||'', JSON.stringify(resources||[]), now, now);
  const s = db.prepare('SELECT * FROM skills WHERE id=?').get(id);
  res.status(201).json({ ...s, resources: JSON.parse(s.resources) });
});

skillsRouter.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT * FROM skills WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!s) return res.status(404).json({ error: 'Skill not found' });
  const { name, category, xp, notes, resources } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE skills SET name=?,category=?,xp=?,notes=?,resources=?,updatedAt=? WHERE id=? AND userId=?')
    .run(name??s.name, category??s.category, xp??s.xp, notes??s.notes,
      JSON.stringify(resources??JSON.parse(s.resources||'[]')), now, req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM skills WHERE id=?').get(req.params.id);
  res.json({ ...updated, resources: JSON.parse(updated.resources) });
});

skillsRouter.post('/:id/xp', requireAuth, (req, res) => {
  const db = getDb();
  const s = db.prepare('SELECT * FROM skills WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!s) return res.status(404).json({ error: 'Skill not found' });
  const { amount } = req.body;
  if (!amount || amount < 0) return res.status(400).json({ error: 'Invalid amount' });
  const now = new Date().toISOString();
  db.prepare('UPDATE skills SET xp=xp+?, updatedAt=? WHERE id=? AND userId=?').run(amount, now, req.params.id, req.userId);
  const updated = db.prepare('SELECT * FROM skills WHERE id=?').get(req.params.id);
  res.json({ ...updated, resources: JSON.parse(updated.resources) });
});

skillsRouter.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM skills WHERE id=? AND userId=?').get(req.params.id, req.userId))
    return res.status(404).json({ error: 'Skill not found' });
  db.prepare('DELETE FROM skills WHERE id=? AND userId=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── QUESTS ────────────────────────────────────────────────────────────────────
export const questsRouter = Router();

const questJoin = `
  SELECT q.*, s.name as skillName, s.category as skillCategory
  FROM quests q LEFT JOIN skills s ON q.relatedSkillId = s.id
  WHERE q.userId = ?
`;

// Auto-reset daily quests that were completed on a previous day
function resetDailyQuests(db, userId) {
  const today = new Date().toISOString().split('T')[0];
  // Find daily quests completed before today → reset them to active
  db.prepare(`
    UPDATE quests
    SET status = 'active', completedAt = NULL, updatedAt = ?
    WHERE userId = ? AND type = 'daily' AND status = 'completed'
    AND lastCompletedDate IS NOT NULL AND lastCompletedDate < ?
  `).run(new Date().toISOString(), userId, today);
}

questsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  // Auto-reset expired daily quests before returning
  resetDailyQuests(db, req.userId);
  const order = `ORDER BY CASE q.type WHEN 'boss' THEN 0 WHEN 'main' THEN 1 WHEN 'side' THEN 2 ELSE 3 END, q.createdAt DESC`;
  res.json(db.prepare(questJoin + ' ' + order).all(req.userId));
});

questsRouter.post('/', requireAuth, (req, res) => {
  const { title, description, type, relatedSkillId, xpReward, deadline } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const xpMap = { main:200, side:100, daily:50, boss:500 };
  const db = getDb(); const now = new Date().toISOString(); const id = uuid();
  db.prepare('INSERT INTO quests (id,userId,title,description,type,status,relatedSkillId,xpReward,deadline,totalCompletions,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)')
    .run(id, req.userId, title.trim(), description||'', type||'main', 'active',
      relatedSkillId||null, xpReward||(xpMap[type||'main']||200), deadline||null, now, now);
  const q = db.prepare(questJoin + ' AND q.id=?').get(req.userId, id);
  res.status(201).json(q);
});

questsRouter.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const ex = db.prepare('SELECT * FROM quests WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!ex) return res.status(404).json({ error: 'Quest not found' });

  const { title, description, type, status, relatedSkillId, xpReward, deadline } = req.body;
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const newStatus = status ?? ex.status;
  const isDaily = (type ?? ex.type) === 'daily';
  const completing = newStatus === 'completed' && ex.status !== 'completed';

  // For daily quests: block completing again on same day
  // Check lastCompletedDate directly (status may already be 'completed' before this PATCH)
  if (isDaily && newStatus === 'completed') {
    const fresh = db.prepare('SELECT lastCompletedDate, status FROM quests WHERE id=?').get(req.params.id);
    if (fresh && fresh.lastCompletedDate === today) {
      return res.status(400).json({ error: 'Ya completaste este quest diario hoy. Vuelve mañana.' });
    }
  }

  let completedAt = ex.completedAt;
  let lastCompletedDate = ex.lastCompletedDate;
  let totalCompletions = ex.totalCompletions || 0;
  let nextStatus = newStatus;
  let coinsAwarded = 0;
  let loot = null;

  if (completing) {
    const reward = xpReward ?? ex.xpReward;
    // Capture XP before award so we can detect level-ups for coin bonuses
    const prof = db.prepare('SELECT totalXP FROM player_profiles WHERE userId=?').get(req.userId);
    const oldXP = prof?.totalXP ?? 0;
    // Award XP to player
    db.prepare('UPDATE player_profiles SET totalXP=totalXP+?, updatedAt=? WHERE userId=?').run(reward, now, req.userId);
    // Award coins (XP trickle + level-up bonus)
    coinsAwarded = awardXpCoins(db, req.userId, oldXP, reward);
    // Award XP to linked skill
    if (ex.relatedSkillId) {
      db.prepare('UPDATE skills SET xp=xp+?, updatedAt=? WHERE id=? AND userId=?')
        .run(Math.floor(reward / 3), now, ex.relatedSkillId, req.userId);
    }
    // Log activity
    db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,relatedId,createdAt) VALUES (?,?,?,?,?,?,?,?)')
      .run(uuid(), req.userId, 'quest_complete', `Quest: ${ex.title}`, reward, coinsAwarded, req.params.id, now);

    // Rare cosmetic loot drop (~8%)
    if (Math.random() < LOOT_DROP_CHANCE) {
      const owned = db.prepare('SELECT itemId FROM inventory WHERE userId=? AND itemType=?').all(req.userId, 'cosmetic').map(r => r.itemId);
      const drop = rollLoot(owned);
      if (drop) {
        db.prepare('INSERT INTO inventory (id,userId,itemType,itemId,quantity,metadata,acquiredAt) VALUES (?,?,?,?,?,?,?)')
          .run(uuid(), req.userId, 'cosmetic', drop.id, 1, JSON.stringify({ source: 'loot', questId: req.params.id }), now);
        db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,relatedId,createdAt) VALUES (?,?,?,?,?,?,?,?)')
          .run(uuid(), req.userId, 'loot_drop', `Botín: ${drop.name}`, 0, 0, drop.id, now);
        loot = { id: drop.id, type: drop.type, name: drop.name, rarity: drop.rarity, data: drop.data };
      }
    }

    totalCompletions += 1;
    lastCompletedDate = today;

    if (isDaily) {
      // Daily quests: mark completed today but they'll auto-reset tomorrow
      completedAt = now;
      nextStatus = 'completed'; // will be reset by resetDailyQuests() next GET
    } else {
      // Non-daily: permanently completed
      completedAt = now;
      nextStatus = 'completed';
    }
  }

  // If un-completing (toggling back to active)
  if (newStatus === 'active' && ex.status === 'completed') {
    completedAt = null;
    nextStatus = 'active';
  }

  db.prepare(`UPDATE quests SET title=?,description=?,type=?,status=?,relatedSkillId=?,xpReward=?,deadline=?,completedAt=?,lastCompletedDate=?,totalCompletions=?,updatedAt=? WHERE id=? AND userId=?`)
    .run(title??ex.title, description??ex.description, type??ex.type, nextStatus,
      relatedSkillId!==undefined ? relatedSkillId : ex.relatedSkillId,
      xpReward??ex.xpReward, deadline!==undefined ? deadline : ex.deadline,
      completedAt, lastCompletedDate, totalCompletions, now, req.params.id, req.userId);

  const updated = db.prepare(questJoin + ' AND q.id=?').get(req.userId, req.params.id);
  res.json({ ...updated, xpAwarded: completing ? (xpReward ?? ex.xpReward) : 0, coinsAwarded, loot });
});

questsRouter.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM quests WHERE id=? AND userId=?').get(req.params.id, req.userId))
    return res.status(404).json({ error: 'Quest not found' });
  db.prepare('DELETE FROM quests WHERE id=? AND userId=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── TASKS ─────────────────────────────────────────────────────────────────────
export const tasksRouter = Router();

const taskJoin = `
  SELECT t.*, s.name as skillName, s.category as skillCategory
  FROM tasks t LEFT JOIN skills s ON t.relatedSkillId = s.id
  WHERE t.userId = ?
`;
const diffXP  = { easy:25, normal:50, hard:100, epic:250 };
const diffOrd = `CASE t.difficulty WHEN 'epic' THEN 0 WHEN 'hard' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END`;

tasksRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  res.json(db.prepare(taskJoin + ` ORDER BY ${diffOrd}, t.dueDate ASC NULLS LAST, t.createdAt DESC`).all(req.userId));
});

tasksRouter.post('/', requireAuth, (req, res) => {
  const { title, description, difficulty, status, relatedSkillId, dueDate } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
  const diff = difficulty || 'normal';
  const db = getDb(); const now = new Date().toISOString(); const id = uuid();
  db.prepare('INSERT INTO tasks (id,userId,title,description,difficulty,status,relatedSkillId,xpReward,dueDate,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.userId, title.trim(), description||'', diff, status||'todo',
      relatedSkillId||null, diffXP[diff]||50, dueDate||null, now, now);
  const t = db.prepare(taskJoin + ' AND t.id=?').get(req.userId, id);
  res.status(201).json(t);
});

tasksRouter.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const ex = db.prepare('SELECT * FROM tasks WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!ex) return res.status(404).json({ error: 'Task not found' });
  const { title, description, difficulty, status, relatedSkillId, dueDate } = req.body;
  const now = new Date().toISOString();
  const newStatus = status ?? ex.status;
  const newDiff   = difficulty ?? ex.difficulty;
  const completing = newStatus === 'completed' && ex.status !== 'completed';
  const completedAt = newStatus === 'completed' ? (ex.completedAt || now) : null;
  let coinsAwarded = 0;

  if (completing) {
    const reward = diffXP[newDiff] || ex.xpReward;
    const prof = db.prepare('SELECT totalXP FROM player_profiles WHERE userId=?').get(req.userId);
    const oldXP = prof?.totalXP ?? 0;
    db.prepare('UPDATE player_profiles SET totalXP=totalXP+?, updatedAt=? WHERE userId=?').run(reward, now, req.userId);
    coinsAwarded = awardXpCoins(db, req.userId, oldXP, reward);
    if (ex.relatedSkillId) {
      db.prepare('UPDATE skills SET xp=xp+?, updatedAt=? WHERE id=? AND userId=?')
        .run(Math.floor(reward / 2), now, ex.relatedSkillId, req.userId);
    }
    db.prepare('INSERT INTO activity_log (id,userId,type,description,xpEarned,coinsEarned,relatedId,createdAt) VALUES (?,?,?,?,?,?,?,?)')
      .run(uuid(), req.userId, 'task_complete', `Tarea: ${ex.title}`, reward, coinsAwarded, req.params.id, now);
    // Update streak
    const today = now.split('T')[0];
    const p = db.prepare('SELECT * FROM player_profiles WHERE userId=?').get(req.userId);
    if (p && p.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const newStreak = p.lastActiveDate === yesterday ? (p.streak || 0) + 1 : 1;
      db.prepare('UPDATE player_profiles SET streak=?, lastActiveDate=?, updatedAt=? WHERE userId=?')
        .run(newStreak, today, now, req.userId);
    }
  }

  db.prepare('UPDATE tasks SET title=?,description=?,difficulty=?,status=?,relatedSkillId=?,xpReward=?,dueDate=?,completedAt=?,updatedAt=? WHERE id=? AND userId=?')
    .run(title??ex.title, description??ex.description, newDiff, newStatus,
      relatedSkillId!==undefined?relatedSkillId:ex.relatedSkillId,
      diffXP[newDiff]||ex.xpReward, dueDate!==undefined?dueDate:ex.dueDate,
      completedAt, now, req.params.id, req.userId);
  const updated = db.prepare(taskJoin + ' AND t.id=?').get(req.userId, req.params.id);
  res.json({ ...updated, xpAwarded: completing ? (diffXP[newDiff] || ex.xpReward) : 0, coinsAwarded });
});

tasksRouter.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM tasks WHERE id=? AND userId=?').get(req.params.id, req.userId))
    return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM tasks WHERE id=? AND userId=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
export const activityRouter = Router();

activityRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  res.json(db.prepare('SELECT * FROM activity_log WHERE userId=? ORDER BY createdAt DESC LIMIT 50').all(req.userId));
});

// ── EVENTS (Calendar) ─────────────────────────────────────────────────────────
export const eventsRouter = Router();

eventsRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { start, end } = req.query;
  let q = `SELECT e.*, s.name as skillName, s.category as skillCategory, qt.title as questTitle
    FROM events e
    LEFT JOIN skills s ON e.relatedSkillId = s.id
    LEFT JOIN quests qt ON e.relatedQuestId = qt.id
    WHERE e.userId = ?`;
  const params = [req.userId];
  if (start) { q += ` AND e.date >= ?`; params.push(start); }
  if (end)   { q += ` AND e.date <= ?`; params.push(end); }
  q += ' ORDER BY e.date ASC, e.startTime ASC';
  res.json(db.prepare(q).all(...params));
});

eventsRouter.post('/', requireAuth, (req, res) => {
  const { title, description, date, startTime, endTime, color, relatedSkillId, relatedQuestId } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título obligatorio' });
  if (!date)          return res.status(400).json({ error: 'Fecha obligatoria' });
  if (!startTime)     return res.status(400).json({ error: 'Hora de inicio obligatoria' });
  if (!endTime)       return res.status(400).json({ error: 'Hora de fin obligatoria' });
  const db = getDb(); const now = new Date().toISOString(); const id = uuid();
  db.prepare('INSERT INTO events (id,userId,title,description,date,startTime,endTime,color,relatedSkillId,relatedQuestId,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.userId, title.trim(), description||'', date, startTime, endTime,
      color||'#1a6bff', relatedSkillId||null, relatedQuestId||null, now, now);
  const ev = db.prepare(`SELECT e.*, s.name as skillName FROM events e LEFT JOIN skills s ON e.relatedSkillId=s.id WHERE e.id=?`).get(id);
  res.status(201).json(ev);
});

eventsRouter.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const ex = db.prepare('SELECT * FROM events WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!ex) return res.status(404).json({ error: 'Evento no encontrado' });
  const { title, description, date, startTime, endTime, color, relatedSkillId, relatedQuestId } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE events SET title=?,description=?,date=?,startTime=?,endTime=?,color=?,relatedSkillId=?,relatedQuestId=?,updatedAt=? WHERE id=? AND userId=?')
    .run(title??ex.title, description??ex.description, date??ex.date, startTime??ex.startTime,
      endTime??ex.endTime, color??ex.color,
      relatedSkillId!==undefined?relatedSkillId:ex.relatedSkillId,
      relatedQuestId!==undefined?relatedQuestId:ex.relatedQuestId,
      now, req.params.id, req.userId);
  const updated = db.prepare(`SELECT e.*, s.name as skillName FROM events e LEFT JOIN skills s ON e.relatedSkillId=s.id WHERE e.id=?`).get(req.params.id);
  res.json(updated);
});

eventsRouter.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM events WHERE id=? AND userId=?').get(req.params.id, req.userId))
    return res.status(404).json({ error: 'Evento no encontrado' });
  db.prepare('DELETE FROM events WHERE id=? AND userId=?').run(req.params.id, req.userId);
  res.json({ success: true });
});

// ── TIME BLOCKS ───────────────────────────────────────────────────────────────
export const timeBlocksRouter = Router();

timeBlocksRouter.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { date } = req.query;
  let q = `SELECT tb.*, t.title as taskTitle FROM time_blocks tb LEFT JOIN tasks t ON tb.relatedTaskId=t.id WHERE tb.userId=?`;
  const params = [req.userId];
  if (date) { q += ` AND (tb.date=? OR tb.isTemplate=1)`; params.push(date); }
  q += ' ORDER BY tb.startHour ASC';
  res.json(db.prepare(q).all(...params));
});

timeBlocksRouter.post('/', requireAuth, (req, res) => {
  const { title, color, startHour, duration, category, relatedTaskId, dayOfWeek, date, isTemplate } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título obligatorio' });
  if (startHour === undefined || startHour < 0 || startHour >= 24) return res.status(400).json({ error: 'Hora inválida' });
  if (!duration || duration <= 0) return res.status(400).json({ error: 'Duración inválida' });
  const db = getDb(); const now = new Date().toISOString(); const id = uuid();
  db.prepare('INSERT INTO time_blocks (id,userId,title,color,startHour,duration,category,relatedTaskId,dayOfWeek,date,isTemplate,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, req.userId, title.trim(), color||'#1a6bff', startHour, duration,
      category||'work', relatedTaskId||null, dayOfWeek??null, date||null, isTemplate?1:0, now, now);
  const tb = db.prepare('SELECT tb.*, t.title as taskTitle FROM time_blocks tb LEFT JOIN tasks t ON tb.relatedTaskId=t.id WHERE tb.id=?').get(id);
  res.status(201).json(tb);
});

timeBlocksRouter.patch('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const ex = db.prepare('SELECT * FROM time_blocks WHERE id=? AND userId=?').get(req.params.id, req.userId);
  if (!ex) return res.status(404).json({ error: 'Bloque no encontrado' });
  const { title, color, startHour, duration, category, relatedTaskId, dayOfWeek, date, isTemplate } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE time_blocks SET title=?,color=?,startHour=?,duration=?,category=?,relatedTaskId=?,dayOfWeek=?,date=?,isTemplate=?,updatedAt=? WHERE id=? AND userId=?')
    .run(title??ex.title, color??ex.color, startHour??ex.startHour, duration??ex.duration,
      category??ex.category, relatedTaskId!==undefined?relatedTaskId:ex.relatedTaskId,
      dayOfWeek!==undefined?dayOfWeek:ex.dayOfWeek, date!==undefined?date:ex.date,
      isTemplate!==undefined?(isTemplate?1:0):ex.isTemplate, now, req.params.id, req.userId);
  const updated = db.prepare('SELECT tb.*, t.title as taskTitle FROM time_blocks tb LEFT JOIN tasks t ON tb.relatedTaskId=t.id WHERE tb.id=?').get(req.params.id);
  res.json(updated);
});

timeBlocksRouter.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  if (!db.prepare('SELECT id FROM time_blocks WHERE id=? AND userId=?').get(req.params.id, req.userId))
    return res.status(404).json({ error: 'Bloque no encontrado' });
  db.prepare('DELETE FROM time_blocks WHERE id=? AND userId=?').run(req.params.id, req.userId);
  res.json({ success: true });
});
