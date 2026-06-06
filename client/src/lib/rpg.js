export const RANK_NAMES  = ['','NOVICE','APPRENTICE','SKILLED','ADVANCED','EXPERT','MASTER','ELITE','LEGEND','MYTHIC','GRANDMASTER'];
export const RANK_CLASS  = ['','rank-novice','rank-apprentice','rank-skilled','rank-advanced','rank-expert','rank-master','rank-elite','rank-legend','rank-mythic','rank-grandmaster'];
export const CAT_CLASS   = { Tech:'cat-tech', Soft:'cat-soft', Domain:'cat-domain', Fitness:'cat-fitness' };
export const CAT_LABELS  = { Tech:'TECH', Soft:'SOFT', Domain:'DOMAIN', Fitness:'FITNESS' };
export const DIFF_LABELS = { easy:'EASY', normal:'NORMAL', hard:'HARD', epic:'EPIC' };
export const DIFF_XP     = { easy:25, normal:50, hard:100, epic:250 };
export const QUEST_LABELS = { main:'MAIN QUEST', side:'SIDE QUEST', daily:'DAILY QUEST', boss:'BOSS QUEST' };

export const SKILL_XP_THR = [0,100,250,500,850,1300,1900,2700,3700,5000];

export function skillLevelFromXP(xp) {
  let lv = 1;
  for (let i=1; i<SKILL_XP_THR.length; i++) { if (xp >= SKILL_XP_THR[i]) lv=i+1; else break; }
  return Math.min(lv,10);
}

export function xpForNextSkillLevel(lv) { return SKILL_XP_THR[lv] ?? 9999; }

const PLAYER_THR = [0,300,700,1300,2100,3200,4600,6400,8700,11600,15200,20000,26000,33000,42000];

export function playerLevelFromXP(xp) {
  let lv=1;
  for (let i=1; i<PLAYER_THR.length; i++) { if (xp >= PLAYER_THR[i]) lv=i+1; else break; }
  return lv;
}

export function playerXPForLevel(lv) { return PLAYER_THR[lv-1] ?? 0; }
export function playerXPForNextLevel(lv) { return PLAYER_THR[lv] ?? PLAYER_THR[PLAYER_THR.length-1]+10000; }

export const PLAYER_TITLES = ['','ROOKIE','EXPLORER','ADVENTURER','WARRIOR','CHAMPION','HERO','VETERAN','LEGEND','MYTHIC','GRANDMASTER','DIVINE','IMMORTAL','TRANSCENDENT','ETERNAL'];

export const ACHIEVEMENTS = [
  { id:'first_task',    name:'FIRST QUEST',      icon:'⚔️',  desc:'Complete your first task.',              xp:50  },
  { id:'ten_tasks',     name:'VETERAN',           icon:'🛡️',  desc:'Complete 10 tasks.',                     xp:100 },
  { id:'level5_skill',  name:'ROAD TO MASTERY',   icon:'⭐',  desc:'Reach Level 5 in any skill.',            xp:200 },
  { id:'level10_skill', name:'GRANDMASTER',        icon:'👑',  desc:'Reach Level 10 in any skill.',           xp:500 },
  { id:'streak7',       name:'CONSISTENT HERO',   icon:'🔥',  desc:'7-day activity streak.',                 xp:150 },
  { id:'streak30',      name:'IRON WILL',          icon:'💎',  desc:'30-day activity streak.',                xp:400 },
  { id:'xp1000',        name:'XP FARMER',          icon:'💰',  desc:'Earn 1,000 total XP.',                   xp:100 },
  { id:'xp5000',        name:'XP HOARDER',         icon:'💵',  desc:'Earn 5,000 total XP.',                   xp:200 },
  { id:'player_lv10',   name:'RISING HERO',        icon:'🚀',  desc:'Reach Player Level 10.',                 xp:300 },
  { id:'player_lv25',   name:'LEGENDARY',          icon:'🌟',  desc:'Reach Player Level 25.',                 xp:1000},
  { id:'five_skills',   name:'POLYMATH',           icon:'📚',  desc:'Have 5 skills.',                         xp:100 },
  { id:'boss_quest',    name:'BOSS SLAYER',        icon:'🐉',  desc:'Complete a Boss Quest.',                 xp:300 },
  { id:'ten_quests',    name:'QUEST MASTER',       icon:'📜',  desc:'Complete 10 quests.',                    xp:250 },
  { id:'collector',     name:'SKILL COLLECTOR',    icon:'🗂️',  desc:'Have 10 skills.',                        xp:150 },
];

export function fmtDeadline(d) {
  if (!d) return null;
  const date = new Date(d);
  const diffDays = Math.ceil((date - new Date()) / 86400000);
  const label = date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  if (diffDays < 0) return { label, suffix:' EXPIRED', cls:'c-red' };
  if (diffDays === 0) return { label, suffix:' TODAY!', cls:'c-orange' };
  if (diffDays <= 7) return { label, suffix:` (${diffDays}d)`, cls:'c-orange' };
  return { label, suffix:` (${diffDays}d)`, cls:'c-green' };
}
