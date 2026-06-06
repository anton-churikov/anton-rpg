import { ACHIEVEMENTS, skillLevelFromXP, playerLevelFromXP } from '../lib/rpg.js'

export default function AchievementsPage({ player, skills, tasks, quests }) {
  const unlocked = player?.unlockedAchievements ?? []
  const totalXP  = player?.totalXP ?? 0

  const stats = {
    tasksCompleted:       tasks.filter(t => t.status === 'completed').length,
    questsCompleted:      quests.filter(q => q.status === 'completed').length,
    bossQuestsCompleted:  quests.filter(q => q.status === 'completed' && q.type === 'boss').length,
    maxSkillLevel:        skills.length > 0 ? Math.max(...skills.map(s => skillLevelFromXP(s.xp))) : 0,
    streak:               player?.streak ?? 0,
    totalXP,
    playerLevel:          playerLevelFromXP(totalXP),
    skillCount:           skills.length,
  }

  const CONDITIONS = {
    first_task:    s => s.tasksCompleted >= 1,
    ten_tasks:     s => s.tasksCompleted >= 10,
    level5_skill:  s => s.maxSkillLevel >= 5,
    level10_skill: s => s.maxSkillLevel >= 10,
    streak7:       s => s.streak >= 7,
    streak30:      s => s.streak >= 30,
    xp1000:        s => s.totalXP >= 1000,
    xp5000:        s => s.totalXP >= 5000,
    player_lv10:   s => s.playerLevel >= 10,
    player_lv25:   s => s.playerLevel >= 25,
    five_skills:   s => s.skillCount >= 5,
    boss_quest:    s => s.bossQuestsCompleted >= 1,
    ten_quests:    s => s.questsCompleted >= 10,
    collector:     s => s.skillCount >= 10,
  }

  const unlockedXP = ACHIEVEMENTS
    .filter(a => unlocked.includes(a.id))
    .reduce((sum, a) => sum + a.xp, 0)

  return (
    <div>
      {/* ── STATS ────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:20 }}>
        {[
          { val:`${unlocked.length}/${ACHIEVEMENTS.length}`, label:'UNLOCKED',   color:'var(--yellow)', border:'var(--yellow)', shadow:'var(--glow-yellow)' },
          { val:unlockedXP,   label:'XP FROM ACHS',  color:'var(--green)',  border:'var(--border2)', shadow:'var(--glow-green)' },
          { val:ACHIEVEMENTS.length - unlocked.length, label:'REMAINING', color:'var(--cyan)', border:'var(--border2)', shadow:'var(--glow-cyan)' },
        ].map(({ val, label, color, border, shadow }) => (
          <div key={label} style={{ background:'var(--panel)', border:`2px solid ${border}`, padding:'12px 16px', flex:1 }}>
            <div style={{ fontFamily:'var(--font-hud)', fontSize:28, color, textShadow:shadow, lineHeight:1 }}>{val}</div>
            <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', letterSpacing:2, marginTop:3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── ACHIEVEMENT GRID ─────────────────────────────────── */}
      <div className="achievement-grid">
        {ACHIEVEMENTS.map(ach => {
          const isUnlocked  = unlocked.includes(ach.id)
          const couldUnlock = !isUnlocked && (CONDITIONS[ach.id]?.(stats) ?? false)
          return (
            <div key={ach.id}
              className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              style={couldUnlock ? { borderColor:'var(--green)', opacity:0.9 } : {}}
            >
              {couldUnlock && (
                <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'var(--green)', boxShadow:'var(--glow-green)' }} />
              )}
              <span className="achievement-icon">{ach.icon}</span>
              <div className="achievement-name">{ach.name}</div>
              <div className="achievement-desc">{ach.desc}</div>
              <div className="achievement-xp">+{ach.xp} XP</div>
              {isUnlocked  && <div className="achievement-unlock-date">UNLOCKED ✓</div>}
              {couldUnlock && !isUnlocked && (
                <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--green)', marginTop:6 }}>✓ READY TO CLAIM</div>
              )}
              {!isUnlocked && !couldUnlock && (
                <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim2)', marginTop:6 }}>🔒 LOCKED</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
