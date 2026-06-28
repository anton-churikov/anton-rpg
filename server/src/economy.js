// ── COIN ECONOMY ────────────────────────────────────────────────────────────
// Coins are a separate currency from XP. They trickle in alongside XP at a
// fixed rate, plus milestone bonuses (level-up, achievements).

import { playerLevelFromXP } from './levels.js';

export const COIN_RATE = 5;            // 1 coin per 5 XP earned
export const LEVELUP_COIN_BONUS = 25;  // per level gained
export const ACHIEVEMENT_COIN_BONUS = 25;

export function coinsForXP(xp) {
  return Math.floor((xp || 0) / COIN_RATE);
}

// Add coins to a player's balance. Returns the amount added (0 if none).
export function awardCoins(db, userId, amount) {
  const amt = Math.max(0, Math.floor(amount || 0));
  if (!amt) return 0;
  db.prepare('UPDATE player_profiles SET coins = coins + ?, updatedAt = ? WHERE userId = ?')
    .run(amt, new Date().toISOString(), userId);
  return amt;
}

// Award the XP-linked coin trickle plus any level-up bonus for an XP gain.
// `oldXP` is the player's total XP *before* the reward was applied.
// Returns the total coins added.
export function awardXpCoins(db, userId, oldXP, reward) {
  let coins = coinsForXP(reward);
  const oldLevel = playerLevelFromXP(oldXP);
  const newLevel = playerLevelFromXP(oldXP + reward);
  if (newLevel > oldLevel) coins += (newLevel - oldLevel) * LEVELUP_COIN_BONUS;
  return awardCoins(db, userId, coins);
}
