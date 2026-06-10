import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { QUEST_LABELS, CAT_CLASS, fmtDeadline } from '../lib/rpg.js'
import { QuestModal, DeleteConfirm } from './Modals.jsx'
import { api } from '../lib/api.js'

const TYPE_ORDER = { boss:0, main:1, side:2, daily:3 }

// Countdown to midnight for daily quests
function MidnightCountdown() {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    const update = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight - now
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--cyan)', letterSpacing:1 }}>
      ⟳ {timeLeft}
    </span>
  )
}

function QuestCard({ quest, onEdit, onDelete, onComplete }) {
  const due = fmtDeadline(quest.deadline)
  const isDone   = quest.status === 'completed'
  const isDaily  = quest.type === 'daily'
  const completedToday = isDone && isDaily

  // Calculate streak for daily quests
  const timesCompleted = quest.totalCompletions || 0

  return (
    <div
      className={`quest-card ${quest.type}`}
      style={{ opacity: isDone && !isDaily ? 0.6 : 1 }}
    >
      <div className="cat-bar" />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:8 }}>
        <span className={`quest-type-tag qt-${quest.type}`}>{QUEST_LABELS[quest.type]}</span>
        <div className="card-actions" style={{ opacity:1 }}>
          {/* Daily: show complete button only if not done today */}
          {/* Non-daily: show complete if not done */}
          {!isDone && (
            <button className="action-btn" onClick={onComplete} title="Completar">✓</button>
          )}
          {/* Daily completed today: show locked */}
          {isDaily && isDone && (
            <span style={{
              fontFamily:'var(--font-hud)', fontSize:11, color:'var(--green)',
              border:'1px solid rgba(0,255,102,0.3)', padding:'2px 6px',
              background:'rgba(0,255,102,0.06)',
            }}>
              ✓ HOY
            </span>
          )}
          <button className="action-btn" onClick={onEdit}>✎</button>
          <button className="action-btn del" onClick={onDelete}>✕</button>
        </div>
      </div>

      {/* Title */}
      <div className="quest-title" style={{
        textDecoration: isDone && !isDaily ? 'line-through' : 'none',
        opacity: completedToday ? 0.7 : 1,
      }}>
        {quest.title}
      </div>

      {quest.description && (
        <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--dim)', lineHeight:1.5, marginBottom:8 }}>
          {quest.description}
        </div>
      )}

      {/* XP reward */}
      <div className="quest-xp-reward">
        <span className="quest-xp-icon">⬡</span>
        +{quest.xpReward} XP
        {quest.type === 'boss' && (
          <span style={{ color:'var(--red)', marginLeft:8, fontSize:13 }}>BOSS</span>
        )}
      </div>

      {/* Daily quest extra info */}
      {isDaily && (
        <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
          {/* Completions counter */}
          <div style={{ display:'flex', alignItems:'center', gap:8, fontFamily:'var(--font-hud)', fontSize:12 }}>
            <span style={{ color:'var(--dim)' }}>🔁 COMPLETADO</span>
            <span style={{ color:'var(--yellow)', textShadow:'var(--glow-yellow)' }}>
              {timesCompleted}x
            </span>
          </div>

          {/* Status */}
          {completedToday ? (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--green)' }}>
                ✓ COMPLETADO HOY — Resetea en
              </span>
              <MidnightCountdown />
            </div>
          ) : (
            <div style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--orange)' }}>
              ● DISPONIBLE HOY
            </div>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="quest-meta" style={{ marginTop:8 }}>
        {quest.skillName && (
          <span className={`skill-link-badge ${CAT_CLASS[quest.skillCategory]||'cat-tech'}`}
            style={{ fontSize:11, padding:'1px 6px' }}>
            {quest.skillName}
          </span>
        )}
        {due && !isDaily && (
          <span className={due.cls} style={{ fontFamily:'var(--font-hud)', fontSize:12 }}>
            ◷ {due.label}{due.suffix}
          </span>
        )}
        {isDone && !isDaily && quest.completedAt && (
          <span style={{ color:'var(--green)', fontFamily:'var(--font-hud)', fontSize:12 }}>
            ✓ COMPLETADO {new Date(quest.completedAt).toLocaleDateString('es-ES')}
          </span>
        )}
      </div>
    </div>
  )
}

// Daily quests info banner
function DailyInfoBanner({ dailyQuests }) {
  const total     = dailyQuests.length
  const doneToday = dailyQuests.filter(q => q.status === 'completed').length
  const allDone   = total > 0 && doneToday === total

  if (total === 0) return null

  return (
    <div style={{
      background: allDone ? 'rgba(0,255,102,0.06)' : 'rgba(0,212,255,0.04)',
      border: `1px solid ${allDone ? 'rgba(0,255,102,0.3)' : 'rgba(0,212,255,0.2)'}`,
      padding: '10px 14px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontFamily:'var(--font-title)', fontSize:6, color: allDone ? 'var(--green)' : 'var(--cyan)', letterSpacing:1 }}>
        {allDone ? '★ DAILY QUESTS COMPLETAS' : '◎ DAILY QUESTS HOY'}
      </span>
      <span style={{ fontFamily:'var(--font-hud)', fontSize:14, color:'var(--white)' }}>
        {doneToday}/{total} completadas
      </span>
      <div style={{ flex:1, height:4, background:'var(--bg3)', border:'1px solid var(--border2)', overflow:'hidden' }}>
        <div style={{
          height:'100%',
          width: `${total > 0 ? Math.round((doneToday/total)*100) : 0}%`,
          background: allDone ? 'var(--green)' : 'linear-gradient(90deg, var(--blue), var(--cyan))',
          transition: 'width 0.5s ease',
        }} />
      </div>
      {!allDone && (
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--font-hud)', fontSize:12, color:'var(--dim)' }}>
          Reset en <MidnightCountdown />
        </div>
      )}
      {allDone && (
        <span style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--green)' }}>
          🎉 ¡Excelente! Vuelven mañana
        </span>
      )}
    </div>
  )
}

export default function QuestsPage({ quests, skills, onQuestsChange, onXPGain }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editQuest, setEditQuest] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [filterType, setFilterType] = useState(null)

  // Listen for header button event
  useEffect(() => {
    const handler = () => { setEditQuest(null); setModalOpen(true) }
    document.addEventListener('open-quest-modal', handler)
    return () => document.removeEventListener('open-quest-modal', handler)
  }, [])

  const dailyQuests  = quests.filter(q => q.type === 'daily')
  const activeNonDaily = quests.filter(q => q.type !== 'daily' && q.status !== 'completed')
  const done         = quests.filter(q => q.type !== 'daily' && q.status === 'completed')

  const displayed = (showDone ? done : [...dailyQuests, ...activeNonDaily])
    .filter(q => !filterType || q.type === filterType)
    .sort((a,b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type])

  const handleSave = async (data, id) => {
    try {
      const saved = id ? await api.quests.update(id, data) : await api.quests.create(data)
      if (id) {
        onQuestsChange(qs => qs.map(q => q.id === id ? saved : q))
        toast('⚔️ QUEST ACTUALIZADO', { className:'rpg-toast' })
      } else {
        onQuestsChange(qs => [saved, ...qs])
        toast('📜 QUEST CREADO', { className:'rpg-toast' })
      }
      setModalOpen(false); setEditQuest(null)
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
  }

  const handleComplete = async (quest) => {
    try {
      const updated = await api.quests.update(quest.id, { status:'completed' })
      onQuestsChange(qs => qs.map(q => q.id === quest.id ? updated : q))
      onXPGain(updated.xpAwarded || quest.xpReward)
      if (quest.type === 'boss')  toast('🐉 ¡BOSS DERROTADO!', { className:'rpg-toast', duration:4000 })
      else if (quest.type === 'daily') toast(`🔁 DAILY COMPLETADO! +${quest.xpReward} XP`, { className:'rpg-toast' })
      else toast(`⭐ QUEST COMPLETO! +${quest.xpReward} XP`, { className:'rpg-toast' })
    } catch(e) {
      // Server returns 400 if already completed today
      toast.error(e.message || 'Error', { className:'rpg-toast' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.quests.delete(id)
      onQuestsChange(qs => qs.filter(q => q.id !== id))
      toast('QUEST ELIMINADO', { className:'rpg-toast' })
      setDeleteTarget(null)
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
  }

  return (
    <div>
      {/* Daily quests progress banner */}
      {!showDone && <DailyInfoBanner dailyQuests={dailyQuests} />}

      {/* Filter bar */}
      <div className="filter-bar">
        <button className={`filter-pill ${!showDone?'active':''}`} onClick={() => setShowDone(false)}>
          ⚔️ ACTIVOS ({activeNonDaily.length + dailyQuests.length})
        </button>
        <button className={`filter-pill ${showDone?'active':''}`} onClick={() => setShowDone(true)}>
          ✓ COMPLETADOS ({done.length})
        </button>
        <div className="filter-sep" />
        {['boss','main','side','daily'].map(t => (
          <button key={t}
            className={`filter-pill ${filterType===t?'active':''}`}
            onClick={() => setFilterType(p => p===t ? null : t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
        <button className="btn btn-yellow btn-sm" style={{ marginLeft:'auto' }}
          onClick={() => { setEditQuest(null); setModalOpen(true) }}>
          + QUEST
        </button>
      </div>

      {/* Quest grid */}
      {displayed.length === 0 ? (
        <div className="empty-state">
          <div className="empty-blink">
            {showDone ? 'AÚN NO HAS COMPLETADO NINGÚN QUEST.' : 'NO HAY QUESTS. CREA TU PRIMERA MISIÓN.'}
          </div>
          {!showDone && (
            <button className="btn btn-yellow" style={{ marginTop:20 }}
              onClick={() => { setEditQuest(null); setModalOpen(true) }}>
              + CREAR QUEST
            </button>
          )}
        </div>
      ) : (
        <div className="quest-grid">
          {displayed.map(q => (
            <QuestCard key={q.id} quest={q}
              onEdit={() => { setEditQuest(q); setModalOpen(true) }}
              onDelete={() => setDeleteTarget(q)}
              onComplete={() => handleComplete(q)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <QuestModal quest={editQuest} skills={skills} onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditQuest(null) }} />
      )}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()}>
            <DeleteConfirm name={deleteTarget.title}
              onConfirm={() => handleDelete(deleteTarget.id)}
              onCancel={() => setDeleteTarget(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
