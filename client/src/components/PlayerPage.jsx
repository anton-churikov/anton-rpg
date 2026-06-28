import { useState, useEffect } from 'react'
import XPBar from './XPBar.jsx'
import {
  playerLevelFromXP,
  playerXPForNextLevel,
  skillLevelFromXP,
  ACHIEVEMENTS,
  SKILL_XP_THR,
} from '../lib/rpg.js'

export default function PlayerPage({ player, skills, tasks, quests }) {
  const totalXP = player?.totalXP ?? 0
  const level = playerLevelFromXP(totalXP)
  const nextLvXP = playerXPForNextLevel(level)
  const prevLvXP = playerXPForNextLevel(level - 1) || 0
  const xpInLevel = totalXP - prevLvXP
  const xpToNext = Math.max(1, nextLvXP - prevLvXP)

  const completedTasks  = tasks.filter(t => t.status === 'completed').length
  const completedQuests = quests.filter(q => q.status === 'completed').length
  const skillCount  = skills.length
  const streak      = player?.streak ?? 0
  const unlockedAchs = player?.unlockedAchievements ?? []
  const recentAchs  = ACHIEVEMENTS.filter(a => unlockedAchs.includes(a.id)).slice(-3)

  const maxSkillLevel = skills.length > 0
    ? Math.max(...skills.map(s => skillLevelFromXP(s.xp)))
    : 0

  const cos = player?.equippedCosmetics ?? {}

  return (
    <div className="player-page">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <div className="player-hero">
        <div className={`player-avatar ${cos.frame ? `cos-frame ${cos.frame.data.className}` : ''}`}>
          {cos.avatar?.data?.glyph || '⚔️'}
        </div>
        <div className="player-info">
          <div className="player-name">
            {player?.displayName || 'ANTON'}
            {cos.badge?.data?.glyph && <span style={{ marginLeft:8 }}>{cos.badge.data.glyph}</span>}
          </div>
          <div className="player-class">◈ {cos.title?.data?.text || 'SKILL ADVENTURER'}</div>
          <div className="global-level-display">
            <span className="global-lv-label">GLOBAL LEVEL</span>
            <span className="global-lv-num">{level}</span>
            <span style={{ fontFamily:'var(--font-hud)', fontSize:14, color:'var(--dim)', marginLeft:4 }}>
              — {getLevelTitle(level)}
            </span>
          </div>
          <XPBar current={xpInLevel} max={xpToNext} color="cyan" height={18} showPct={false} />
          <div style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--dim)', marginTop:4 }}>
            <span style={{ color:'var(--green)' }}>{totalXP.toLocaleString()}</span> TOTAL XP &nbsp;·&nbsp;
            <span style={{ color:'var(--cyan)' }}>{Math.max(0, nextLvXP - totalXP).toLocaleString()}</span> TO LEVEL {level + 1}
          </div>
          {streak > 0 && (
            <div className="streak-display">🔥 {streak} DAY STREAK</div>
          )}
        </div>
      </div>

      {/* ── STATS GRID ────────────────────────────────────────── */}
      <div className="player-stats-grid">
        {[
          { val: level,           label: 'PLAYER LVL',     color: 'var(--yellow)', shadow: 'var(--glow-yellow)' },
          { val: totalXP.toLocaleString(), label:'TOTAL XP', color:'var(--green)', shadow:'var(--glow-green)' },
          { val: streak,          label: 'DAY STREAK',     color: 'var(--orange)', shadow:'var(--glow-orange)' },
          { val: skillCount,      label: 'SKILLS',          color: 'var(--cyan)',   shadow:'var(--glow-cyan)' },
          { val: completedQuests, label: 'QUESTS DONE',    color: 'var(--blue2)',  shadow: 'none' },
          { val: completedTasks,  label: 'TASKS DONE',     color: 'var(--purple)', shadow: 'none' },
          { val: unlockedAchs.length, label:'ACHIEVEMENTS', color:'var(--yellow)',  shadow: 'none' },
          { val: maxSkillLevel,   label: 'MAX SKILL LV',   color: 'var(--red)',    shadow: 'none' },
          { val: tasks.filter(t => t.status !== 'completed').length, label:'ACTIVE MISSIONS', color:'var(--green)', shadow:'none' },
        ].map(({ val, label, color, shadow }) => (
          <div key={label} className="pstat">
            <div className="pstat-val" style={{ color, textShadow: shadow }}>{val}</div>
            <div className="pstat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── SKILL POWER LEVELS ────────────────────────────────── */}
      <div>
        <div className="section-header">
          <span className="section-title">// SKILL POWER LEVELS</span>
          <div className="section-line" />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[...skills].sort((a,b) => b.xp - a.xp).slice(0, 8).map(skill => {
            const lv    = skillLevelFromXP(skill.xp)
            const nextXP = SKILL_XP_THR[lv] ?? 9999
            const prevXP = SKILL_XP_THR[lv - 1] ?? 0
            const range  = Math.max(1, nextXP - prevXP)
            const pct    = lv >= 10 ? 100 : Math.max(0, Math.round(((skill.xp - prevXP) / range) * 100))
            return (
              <div key={skill.id} style={{
                background:'var(--panel)', border:'1px solid var(--border2)',
                padding:'8px 12px', display:'flex', alignItems:'center', gap:12
              }}>
                <div style={{ fontFamily:'var(--font-hud)', fontSize:20, color:'var(--yellow)', width:28, textAlign:'center', textShadow:'var(--glow-yellow)' }}>
                  {lv}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:'var(--font-title)', fontSize:6, color:'var(--white)', letterSpacing:1, marginBottom:4 }}>
                    {skill.name}
                  </div>
                  <div style={{ height:6, background:'var(--bg)', border:'1px solid var(--border2)', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(90deg, var(--blue), var(--cyan))', transition:'width 0.6s' }} />
                  </div>
                </div>
                <div style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--green)', width:70, textAlign:'right' }}>
                  {skill.xp.toLocaleString()} XP
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RECENT ACHIEVEMENTS ───────────────────────────────── */}
      {recentAchs.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">// RECENT ACHIEVEMENTS</span>
            <div className="section-line" />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {recentAchs.map(a => (
              <div key={a.id} style={{
                flex:1, background:'var(--panel)', border:'2px solid var(--yellow)',
                padding:'12px', textAlign:'center', boxShadow:'var(--glow-yellow)'
              }}>
                <div style={{ fontSize:24, marginBottom:6 }}>{a.icon}</div>
                <div style={{ fontFamily:'var(--font-title)', fontSize:5, color:'var(--yellow)', letterSpacing:1, lineHeight:1.6 }}>{a.name}</div>
                <div style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--green)', marginTop:4 }}>+{a.xp} XP</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getLevelTitle(lv) {
  const titles = ['','ROOKIE','EXPLORER','ADVENTURER','WARRIOR','CHAMPION',
    'HERO','VETERAN','LEGEND','MYTHIC','GRANDMASTER','DIVINE','IMMORTAL']
  return titles[Math.min(lv, titles.length - 1)] || 'IMMORTAL'
}
