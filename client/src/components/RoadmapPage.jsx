import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api.js'
import { QuestModal, DeleteConfirm } from './Modals.jsx'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  boss:  { label:'BOSS QUEST',    color:'#ff2244', glow:'0 0 12px rgba(255,34,68,0.6)',  icon:'🐉' },
  main:  { label:'MAIN QUEST',    color:'#ffdd00', glow:'0 0 12px rgba(255,221,0,0.5)',  icon:'⭐' },
  side:  { label:'SIDE QUEST',    color:'#00d4ff', glow:'0 0 12px rgba(0,212,255,0.5)',  icon:'◈'  },
  daily: { label:'DAILY QUEST',   color:'#00ff66', glow:'0 0 12px rgba(0,255,102,0.5)',  icon:'🔁' },
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatDate(d) {
  if (!d) return null
  const date = new Date(d + 'T00:00:00')
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`
}

function getDaysLeft(d) {
  if (!d) return null
  const diff = Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000)
  if (diff < 0)   return { text: `Hace ${Math.abs(diff)}d`, color: 'var(--dim)', past: true }
  if (diff === 0) return { text: 'HOY',                     color: 'var(--yellow)', today: true }
  if (diff <= 7)  return { text: `${diff}d`,               color: 'var(--orange)' }
  if (diff <= 30) return { text: `${diff}d`,               color: 'var(--yellow)' }
  const months = Math.floor(diff / 30)
  return { text: months > 0 ? `${months}m` : `${diff}d`,  color: 'var(--dim)' }
}

// Group quests by year+month of deadline (no deadline → "Sin fecha")
function groupByTimeline(quests) {
  const groups = {}
  const noDate = []

  for (const q of quests) {
    if (!q.deadline) { noDate.push(q); continue }
    const d = new Date(q.deadline + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!groups[key]) groups[key] = { year: d.getFullYear(), month: d.getMonth(), quests: [] }
    groups[key].quests.push(q)
  }

  // Sort groups chronologically
  const sorted = Object.entries(groups)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([,g]) => g)

  return { sorted, noDate }
}

// ── QUEST ROADMAP CARD ────────────────────────────────────────────────────────
function RoadmapCard({ quest, onEdit, onDelete, onComplete, isLast }) {
  const cfg = TYPE_CONFIG[quest.type] || TYPE_CONFIG.main
  const dl  = getDaysLeft(quest.deadline)
  const isDone = quest.status === 'completed'
  const isDaily = quest.type === 'daily'
  const doneToday = isDone && isDaily && quest.lastCompletedDate === new Date().toISOString().split('T')[0]

  return (
    <div style={{ display:'flex', gap:0, marginBottom: isLast ? 0 : 0 }}>
      {/* Timeline dot + line */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginRight:16, flexShrink:0 }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: isDone ? 'var(--green)' : cfg.color,
          boxShadow: isDone ? 'var(--glow-green)' : cfg.glow,
          border: '2px solid var(--bg2)',
          flexShrink: 0,
          transition: 'all 0.3s',
        }} />
        {!isLast && (
          <div style={{ width: 2, flex: 1, minHeight: 20, background: 'var(--border2)', marginTop: 4 }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        background: isDone ? 'rgba(0,255,102,0.04)' : 'var(--panel)',
        border: `1px solid ${isDone ? 'rgba(0,255,102,0.2)' : 'var(--border2)'}`,
        borderLeft: `3px solid ${isDone ? 'var(--green)' : cfg.color}`,
        padding: '12px 14px',
        marginBottom: 10,
        transition: 'all 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
        onMouseEnter={e => { if(!isDone) e.currentTarget.style.borderColor=cfg.color }}
        onMouseLeave={e => { if(!isDone) e.currentTarget.style.borderColor='var(--border2)' }}
      >
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
          <div style={{ flex:1 }}>
            {/* Type badge */}
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
              <span style={{
                fontFamily:'var(--font-title)', fontSize:5, letterSpacing:1,
                color: cfg.color, border:`1px solid ${cfg.color}33`,
                background:`${cfg.color}11`, padding:'2px 6px',
              }}>
                {cfg.icon} {cfg.label}
              </span>
              {isDone && (
                <span style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--green)' }}>✓ COMPLETADO</span>
              )}
              {doneToday && (
                <span style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--green)' }}>• HOY</span>
              )}
            </div>
            {/* Title */}
            <div style={{
              fontFamily:'var(--font-title)', fontSize:7, color:'var(--white)',
              letterSpacing:0.5, lineHeight:1.6,
              textDecoration: isDone && !isDaily ? 'line-through' : 'none',
              opacity: isDone && !isDaily ? 0.6 : 1,
            }}>
              {quest.title}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
            {!isDone && <button className="action-btn" onClick={onComplete} title="Completar" style={{fontSize:10}}>✓</button>}
            <button className="action-btn" onClick={onEdit} style={{fontSize:10}}>✎</button>
            <button className="action-btn del" onClick={onDelete} style={{fontSize:10}}>✕</button>
          </div>
        </div>

        {/* Description */}
        {quest.description && (
          <div style={{ fontFamily:'var(--font-body)', fontSize:11, color:'var(--dim)', lineHeight:1.5, marginBottom:8 }}>
            {quest.description}
          </div>
        )}

        {/* Footer row */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {/* XP */}
          <span style={{ fontFamily:'var(--font-hud)', fontSize:14, color:'var(--green)', textShadow:'var(--glow-green)' }}>
            +{quest.xpReward} XP
          </span>

          {/* Deadline */}
          {quest.deadline && (
            <span style={{
              fontFamily:'var(--font-hud)', fontSize:13,
              color: dl ? dl.color : 'var(--dim)',
              display:'flex', alignItems:'center', gap:4,
            }}>
              ◷ {formatDate(quest.deadline)}
              {dl && !dl.past && (
                <span style={{
                  background: `${dl.color}22`, border:`1px solid ${dl.color}44`,
                  padding:'0 5px', fontSize:11, borderRadius:2,
                  fontWeight: dl.today ? 700 : 400,
                }}>
                  {dl.text}
                </span>
              )}
              {dl?.past && <span style={{ fontSize:11, opacity:0.5 }}>(vencido)</span>}
            </span>
          )}

          {/* Linked skill */}
          {quest.skillName && (
            <span style={{
              fontFamily:'var(--font-hud)', fontSize:11, color:'var(--cyan)',
              border:'1px solid rgba(0,212,255,0.3)', background:'rgba(0,212,255,0.06)',
              padding:'1px 6px',
            }}>
              {quest.skillName}
            </span>
          )}

          {/* Daily completions */}
          {isDaily && (
            <span style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', marginLeft:'auto' }}>
              🔁 {quest.totalCompletions || 0}x completado
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TIMELINE GROUP ────────────────────────────────────────────────────────────
function TimelineGroup({ year, month, quests, onEdit, onDelete, onComplete, isPast }) {
  const now = new Date()
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Month marker */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{
          fontFamily:'var(--font-title)', fontSize:7, letterSpacing:2,
          color: isCurrentMonth ? 'var(--yellow)' : isPast ? 'var(--dim)' : 'var(--cyan)',
          textShadow: isCurrentMonth ? 'var(--glow-yellow)' : isPast ? 'none' : 'var(--glow-cyan)',
          padding:'4px 12px',
          border: `1px solid ${isCurrentMonth ? 'var(--yellow)' : isPast ? 'var(--border2)' : 'var(--cyan)'}`,
          background: isCurrentMonth ? 'rgba(255,221,0,0.06)' : 'transparent',
          whiteSpace:'nowrap',
        }}>
          {isCurrentMonth && '▶ '}
          {MONTHS_FULL[month].toUpperCase()} {year}
          {isCurrentMonth && ' — AHORA'}
        </div>
        <div style={{ flex:1, height:1, background:'linear-gradient(90deg, var(--border2), transparent)' }} />
        <span style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--dim)', whiteSpace:'nowrap' }}>
          {quests.length} quest{quests.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Quests in this group */}
      <div style={{ paddingLeft: 8 }}>
        {[...quests]
          .sort((a,b) => (a.deadline||'').localeCompare(b.deadline||''))
          .map((q, i, arr) => (
            <RoadmapCard
              key={q.id} quest={q}
              onEdit={() => onEdit(q)}
              onDelete={() => onDelete(q)}
              onComplete={() => onComplete(q)}
              isLast={i === arr.length - 1}
            />
          ))
        }
      </div>
    </div>
  )
}

// ── MAIN ROADMAP PAGE ─────────────────────────────────────────────────────────
export default function RoadmapPage({ quests, skills, onQuestsChange, onXPGain }) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [editQuest, setEditQuest]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterType, setFilterType]   = useState(null)
  const [showDone, setShowDone]       = useState(false)

  // Listen for header button
  useEffect(() => {
    const h = () => { setEditQuest(null); setModalOpen(true) }
    document.addEventListener('open-quest-modal', h)
    return () => document.removeEventListener('open-quest-modal', h)
  }, [])

  const filtered = quests
    .filter(q => showDone ? q.status === 'completed' : q.status !== 'completed' || q.type === 'daily')
    .filter(q => !filterType || q.type === filterType)

  const { sorted: groups, noDate } = groupByTimeline(filtered)

  const now = new Date()
  const stats = {
    total:     quests.filter(q => q.type !== 'daily').length,
    done:      quests.filter(q => q.status === 'completed' && q.type !== 'daily').length,
    boss:      quests.filter(q => q.type === 'boss' && q.status !== 'completed').length,
    upcoming:  quests.filter(q => q.deadline && q.status !== 'completed' && new Date(q.deadline+'T00:00:00') > now).length,
    overdue:   quests.filter(q => q.deadline && q.status !== 'completed' && new Date(q.deadline+'T00:00:00') < now && q.type !== 'daily').length,
  }

  const handleSave = async (data, id) => {
    try {
      const saved = id ? await api.quests.update(id, data) : await api.quests.create(data)
      if (id) {
        onQuestsChange(qs => qs.map(q => q.id === id ? saved : q))
        toast('✓ QUEST ACTUALIZADO', { className:'rpg-toast' })
      } else {
        onQuestsChange(qs => [saved, ...qs])
        toast('📜 QUEST AÑADIDO AL ROADMAP', { className:'rpg-toast' })
      }
      setModalOpen(false); setEditQuest(null)
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
  }

  const handleComplete = async (quest) => {
    try {
      const updated = await api.quests.update(quest.id, { status:'completed' })
      onQuestsChange(qs => qs.map(q => q.id === quest.id ? updated : q))
      onXPGain(updated.xpAwarded || quest.xpReward)
      if (quest.type === 'boss') toast('🐉 ¡BOSS DERROTADO! ¡LOGRO DESBLOQUEADO!', { className:'rpg-toast', duration:4000 })
      else toast(`⭐ +${quest.xpReward} XP — QUEST COMPLETADO`, { className:'rpg-toast' })
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
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
      {/* ── STATS BAR ──────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:0, border:'1px solid var(--border2)', marginBottom:16, overflow:'hidden' }}>
        {[
          { val:stats.total,    label:'TOTAL',     color:'var(--white)' },
          { val:stats.done,     label:'COMPLETADOS', color:'var(--green)', shadow:'var(--glow-green)' },
          { val:stats.boss,     label:'BOSS',      color:'var(--red)',   shadow:'var(--glow-red)' },
          { val:stats.upcoming, label:'PRÓXIMOS',  color:'var(--cyan)',  shadow:'var(--glow-cyan)' },
          { val:stats.overdue,  label:'VENCIDOS',  color: stats.overdue > 0 ? 'var(--orange)' : 'var(--dim)', shadow: stats.overdue > 0 ? 'var(--glow-orange)' : 'none' },
        ].map(({ val, label, color, shadow }) => (
          <div key={label} style={{ flex:1, padding:'10px 14px', borderRight:'1px solid var(--border2)', background:'var(--bg3)' }}>
            <div style={{ fontFamily:'var(--font-hud)', fontSize:26, color, textShadow:shadow||'none', lineHeight:1 }}>{val}</div>
            <div style={{ fontFamily:'var(--font-hud)', fontSize:9, color:'var(--dim)', letterSpacing:2, marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────── */}
      <div className="filter-bar">
        <button className={`filter-pill ${!showDone?'active':''}`} onClick={() => setShowDone(false)}>
          ACTIVOS
        </button>
        <button className={`filter-pill ${showDone?'active':''}`} onClick={() => setShowDone(true)}>
          COMPLETADOS
        </button>
        <div className="filter-sep" />
        {Object.entries(TYPE_CONFIG).map(([k,v]) => (
          <button key={k}
            className={`filter-pill ${filterType===k?'active':''}`}
            style={filterType===k ? { borderColor:v.color, color:v.color, background:`${v.color}11` } : {}}
            onClick={() => setFilterType(p => p===k ? null : k)}
          >
            {v.icon} {k.toUpperCase()}
          </button>
        ))}
        <button className="btn btn-yellow btn-sm" style={{ marginLeft:'auto' }}
          onClick={() => { setEditQuest(null); setModalOpen(true) }}>
          + AÑADIR
        </button>
      </div>

      {/* ── EMPTY STATE ────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="empty-state">
          <pre className="empty-ascii">{`
  ╔══════════════════════════════╗
  ║  [ ROADMAP VACÍO ]           ║
  ║  Añade tus objetivos         ║
  ║  y traza tu camino           ║
  ╚══════════════════════════════╝`}</pre>
          <div className="empty-blink">DEFINE TUS METAS. TRAZA TU CAMINO.</div>
          <button className="btn btn-yellow" style={{ marginTop:20 }}
            onClick={() => { setEditQuest(null); setModalOpen(true) }}>
            + PRIMER OBJETIVO
          </button>
        </div>
      )}

      {/* ── TIMELINE ───────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div>
          {/* Overdue section */}
          {!showDone && groups.filter(g => {
            const gDate = new Date(g.year, g.month, 1)
            const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            return gDate < nowMonth
          }).map((g, i) => (
            <TimelineGroup key={`${g.year}-${g.month}`}
              year={g.year} month={g.month} quests={g.quests}
              onEdit={setEditQuest} onDelete={setDeleteTarget}
              onComplete={handleComplete} isPast={true}
            />
          ))}

          {/* Current and future months */}
          {groups.filter(g => {
            if (showDone) return true
            const gDate = new Date(g.year, g.month, 1)
            const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            return gDate >= nowMonth
          }).map(g => (
            <TimelineGroup key={`${g.year}-${g.month}`}
              year={g.year} month={g.month} quests={g.quests}
              onEdit={setEditQuest} onDelete={setDeleteTarget}
              onComplete={handleComplete} isPast={false}
            />
          ))}

          {/* No deadline section */}
          {noDate.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{
                  fontFamily:'var(--font-title)', fontSize:7, letterSpacing:2,
                  color:'var(--dim)', border:'1px solid var(--border2)',
                  padding:'4px 12px', whiteSpace:'nowrap',
                }}>
                  ◎ SIN FECHA LÍMITE
                </div>
                <div style={{ flex:1, height:1, background:'linear-gradient(90deg,var(--border2),transparent)' }} />
              </div>
              <div style={{ paddingLeft:8 }}>
                {noDate.map((q, i) => (
                  <RoadmapCard key={q.id} quest={q}
                    onEdit={() => setEditQuest(q)} onDelete={() => setDeleteTarget(q)}
                    onComplete={() => handleComplete(q)} isLast={i===noDate.length-1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────── */}
      {(modalOpen || editQuest) && (
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
