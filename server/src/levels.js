// Server-side mirror of client/src/lib/rpg.js PLAYER_THR.
// Keep these two in sync. Used to award level-up coin bonuses authoritatively.
export const PLAYER_THR = [0,300,700,1300,2100,3200,4600,6400,8700,11600,15200,20000,26000,33000,42000];

export function playerLevelFromXP(xp) {
  let lv = 1;
  for (let i = 1; i < PLAYER_THR.length; i++) {
    if (xp >= PLAYER_THR[i]) lv = i + 1; else break;
  }
  return lv;
}
