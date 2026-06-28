import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api.js'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 25 }, (_, i) => i)
const BAR_CATEGORIES = [
  { key:'sleep',   label:'SUEÑO',      color:'#4444aa', icon:'🌙' },
  { key:'work',    label:'TRABAJO',     color:'#1a6bff', icon:'💼' },
  { key:'study',   label:'ESTUDIO',     color:'#aa44ff', icon:'📚' },
  { key:'fitness', label:'EJERCICIO',   color:'#00ff66', icon:'💪' },
  { key:'hobby',   label:'HOBBY',       color:'#ff7700', icon:'🎮' },
  { key:'social',  label:'SOCIAL',      color:'#ff69b4', icon:'👥' },
  { key:'rest',    label:'DESCANSO',    color:'#00d4ff', icon:'☕' },
  { key:'other',   label:'OTRO',        color:'#888888', icon:'◉'  },
]

const CAT_MAP = Object.fromEntries(BAR_CATEGORIES.map(c => [c.key, c]))

function hToLabel(h) {
  if (h === 0 || h === 24) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h-12} PM`
}

function hToDisplay(h) {
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  const ampm  = whole < 12 ? 'AM' : 'PM'
  const h12   = whole === 0 ? 12 : whole > 12 ? whole - 12 : whole
  return `${h12}:${String(mins).padStart(2,'0')} ${ampm}`
}

function snapTo30(h) {
  return Math.round(h * 2) / 2
}

// Total hours allocated per category
function getTotals(blocks) {
  const totals = {}
  for (const b of blocks) {
    totals[b.category] = (totals[b.category] || 0) + b.duration
  }
  return totals
}

// Hours per category still ahead of `nowHour` (un-elapsed portion of each block).
// A block fully in the past contributes 0; fully ahead contributes its full duration;
// in-progress contributes only the minutes still remaining.
function getRemaining(blocks, nowHour) {
  const rem = {}
  for (const b of blocks) {
    const end  = b.startHour + b.duration
    const left = Math.max(0, Math.min(end, 24) - Math.max(b.startHour, nowHour))
    if (left > 0) rem[b.category] = (rem[b.category] || 0) + left
  }
  return rem
}

// Current time as a fractional hour (0–24), e.g. 14.5 = 2:30 PM
function nowAsHour() {
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

// Format a fractional-hour amount as "2h", "45m", or "1h 30m"
function fmtHours(h) {
  if (h <= 0) return '0h'
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  if (whole === 0) return `${mins}m`
  if (mins === 0)  return `${whole}h`
  return `${whole}h ${mins}m`
}

// Check if two blocks overlap
function overlaps(a, b) {
  return a.startHour < b.startHour + b.duration && a.startHour + a.duration > b.startHour
}

// ── BLOCK MODAL ───────────────────────────────────────────────────────────────
function BlockModal({ block, defaultStart, defaultEnd, tasks, onSave, onDelete, onClose }) {
  const isEdit = !!block
  const [form, setForm] = useState({
    title:         block?.title       || '',
    category:      block?.category    || 'work',
    startHour:     block?.startHour   ?? defaultStart ?? 9,
    duration:      block?.duration    ?? (defaultEnd ? defaultEnd - (defaultStart||9) : 1),
    color:         block?.color       || '#1a6bff',
    relatedTaskId: block?.relatedTaskId || '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const endHour = form.startHour + form.duration

  // Auto-set color from category
  const handleCatChange = (cat) => {
    const catObj = CAT_MAP[cat]
    set('category', cat)
    if (catObj) set('color', catObj.color)
    if (!form.title || Object.values(CAT_MAP).some(c => c.label === form.title)) {
      set('title', catObj?.label || '')
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Título obligatorio', { className:'rpg-toast' }); return }
    if (form.duration <= 0) { toast.error('Duración inválida', { className:'rpg-toast' }); return }
    setSaving(true)
    await onSave({
      ...form,
      title: form.title.trim(),
      relatedTaskId: form.relatedTaskId || null,
    }, block?.id)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? '▶ EDITAR BLOQUE' : '▶ NUEVO BLOQUE'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: 12 }}>
          {/* Category picker */}
          <div className="form-group">
            <label className="form-label">CATEGORÍA</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {BAR_CATEGORIES.map(c => (
                <button key={c.key} type="button"
                  onClick={() => handleCatChange(c.key)}
                  style={{
                    padding:'5px 10px', border:`1px solid ${form.category===c.key ? c.color : 'var(--border2)'}`,
                    background: form.category===c.key ? `${c.color}22` : 'var(--bg3)',
                    color: form.category===c.key ? c.color : 'var(--dim)',
                    fontFamily:'var(--font-hud)', fontSize:12, cursor:'pointer',
                    transition:'all 0.1s',
                    boxShadow: form.category===c.key ? `0 0 8px ${c.color}44` : 'none',
                  }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label className="form-label">DESCRIPCIÓN <span className="req">*</span></label>
            <input className="form-input" value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="¿Qué harás en este tiempo?" autoFocus />
          </div>

          {/* Time range */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">INICIO</label>
              <select className="form-select" value={form.startHour}
                onChange={e => set('startHour', Number(e.target.value))}>
                {Array.from({length:48},(_,i)=>i*0.5).map(h=>(
                  <option key={h} value={h}>{hToDisplay(h)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">DURACIÓN</label>
              <select className="form-select" value={form.duration}
                onChange={e => set('duration', Number(e.target.value))}>
                {[0.5,1,1.5,2,2.5,3,3.5,4,5,6,7,8,10,12].map(d=>(
                  <option key={d} value={d}>{d < 1 ? '30 min' : d === 1 ? '1 hora' : `${d} horas`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background:'var(--bg3)', border:'1px solid var(--border2)',
            padding:'8px 12px', fontFamily:'var(--font-hud)', fontSize:14,
            color: form.color,
          }}>
            {hToDisplay(form.startHour)} → {hToDisplay(Math.min(endHour, 24))}
            &nbsp;·&nbsp; {form.duration < 1 ? '30 min' : form.duration === 1 ? '1 hora' : `${form.duration} horas`}
          </div>

          {/* Linked task */}
          {tasks.length > 0 && (
            <div className="form-group">
              <label className="form-label">MISIÓN VINCULADA</label>
              <select className="form-select" value={form.relatedTaskId}
                onChange={e => set('relatedTaskId', e.target.value)}>
                <option value="">— NINGUNA —</option>
                {tasks.filter(t=>t.status!=='completed').map(t=>(
                  <option key={t.id} value={t.id}>{t.title.slice(0,40)}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEdit && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(block.id)}>✕ ELIMINAR</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>CANCELAR</button>
          <button className="btn btn-yellow" onClick={handleSave} disabled={saving}>
            {saving ? '...' : isEdit ? '▶ GUARDAR' : '▶ AÑADIR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN TIME MANAGEMENT PAGE ─────────────────────────────────────────────────
export default function TimeManagementPage({ tasks }) {
  const [blocks, setBlocks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | { block?, startHour, endHour }
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView]       = useState('day') // 'day' | 'template'
  const barRef = useRef(null)
  const [dragging, setDragging] = useState(null) // { startX, startHour, block? }

  const fetchBlocks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.timeblocks.list(selectedDate)
      setBlocks(data.filter(b => view === 'template' ? b.isTemplate : !b.isTemplate || b.date === selectedDate))
    } catch {
      toast.error('Error al cargar bloques', { className:'rpg-toast' })
    } finally {
      setLoading(false)
    }
  }, [selectedDate, view])

  useEffect(() => { fetchBlocks() }, [fetchBlocks])

  // Live clock — drives the "AHORA" marker and the "what's left today" panel
  const [nowHour, setNowHour] = useState(nowAsHour())
  useEffect(() => {
    const t = setInterval(() => setNowHour(nowAsHour()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  const handleSave = async (formData, id) => {
    try {
      const payload = {
        ...formData,
        date: view === 'template' ? null : selectedDate,
        isTemplate: view === 'template',
      }
      const saved = id ? await api.timeblocks.update(id, payload) : await api.timeblocks.create(payload)
      if (id) setBlocks(bs => bs.map(b => b.id === id ? saved : b))
      else    setBlocks(bs => [...bs, saved])
      toast('✓ BLOQUE GUARDADO', { className:'rpg-toast' })
      setModal(null)
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
  }

  const handleDelete = async (id) => {
    try {
      await api.timeblocks.delete(id)
      setBlocks(bs => bs.filter(b => b.id !== id))
      toast('BLOQUE ELIMINADO', { className:'rpg-toast' })
      setModal(null)
    } catch(e) { toast.error(e.message||'Error', { className:'rpg-toast' }) }
  }

  // Get click position on bar as hour (0-24)
  const barClickToHour = useCallback((e) => {
    if (!barRef.current) return 0
    const rect = barRef.current.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    return snapTo30(Math.max(0, Math.min(24, pct * 24)))
  }, [])

  const handleBarClick = (e) => {
    if (e.target !== e.currentTarget) return
    const h = barClickToHour(e)
    setModal({ startHour: h, endHour: Math.min(h + 1, 24) })
  }

  const totals = getTotals(blocks)
  const totalAllocated = Object.values(totals).reduce((s, v) => s + v, 0)
  const totalFree = Math.max(0, 24 - totalAllocated)

  // "What's left today" only makes sense for the live day in the DÍA view.
  const isToday = view === 'day' && selectedDate === new Date().toISOString().split('T')[0]
  const remaining = isToday ? getRemaining(blocks, nowHour) : {}
  const totalRemaining = Object.values(remaining).reduce((s, v) => s + v, 0)

  // Sort blocks for display
  const sortedBlocks = [...blocks].sort((a,b) => a.startHour - b.startHour)

  return (
    <div>
      {/* ── TOOLBAR ─────────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:16, flexWrap:'wrap' }}>
        <div className="view-toggle">
          <button className={`view-btn ${view==='day'?'active':''}`} onClick={() => setView('day')}>DÍA</button>
          <button className={`view-btn ${view==='template'?'active':''}`} onClick={() => setView('template')}>PLANTILLA</button>
        </div>

        {view === 'day' && (
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate()-1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>◀</button>
            <input type="date" className="form-input" value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{ width:140, colorScheme:'dark', padding:'5px 8px', fontSize:13 }} />
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate()+1)
              setSelectedDate(d.toISOString().split('T')[0])
            }}>▶</button>
            <button className="btn btn-ghost btn-sm"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
              HOY
            </button>
          </div>
        )}

        <button className="btn btn-yellow btn-sm" style={{ marginLeft:'auto' }}
          onClick={() => setModal({ startHour:9, endHour:10 })}>
          + BLOQUE
        </button>
      </div>

      {/* ── 24H BAR ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontFamily:'var(--font-title)', fontSize:7, color:'var(--cyan)', letterSpacing:2 }}>
            DISTRIBUCIÓN DEL DÍA — 24 HORAS
          </span>
          <span style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--dim)' }}>
            {totalAllocated.toFixed(1)}h asignadas &nbsp;·&nbsp;
            <span style={{ color: totalFree > 0 ? 'var(--green)' : 'var(--orange)' }}>
              {totalFree.toFixed(1)}h libres
            </span>
          </span>
        </div>

        {/* Hour labels */}
        <div style={{ display:'flex', marginBottom:2, position:'relative' }}>
          {[0,3,6,9,12,15,18,21,24].map(h => (
            <div key={h} style={{
              position:'absolute',
              left: `${(h/24)*100}%`,
              fontFamily:'var(--font-hud)', fontSize:10, color:'var(--dim)',
              transform: h===24 ? 'translateX(-100%)' : h===0 ? 'none' : 'translateX(-50%)',
            }}>
              {hToLabel(h)}
            </div>
          ))}
          <div style={{ height:16 }} />
        </div>

        {/* The bar */}
        <div
          ref={barRef}
          onClick={handleBarClick}
          style={{
            position:'relative', height:56,
            background:'var(--bg3)', border:'2px solid var(--border2)',
            cursor:'crosshair', userSelect:'none', overflow:'hidden',
          }}
        >
          {/* Hour grid lines */}
          {HOURS.slice(1,-1).map(h => (
            <div key={h} style={{
              position:'absolute', left:`${(h/24)*100}%`, top:0, bottom:0,
              width:1, background: h%6===0 ? 'var(--border2)' : 'rgba(255,255,255,0.03)',
              pointerEvents:'none',
            }} />
          ))}

          {/* Time blocks */}
          {sortedBlocks.map(b => {
            const left  = (b.startHour / 24) * 100
            const width = (b.duration  / 24) * 100
            const cat   = CAT_MAP[b.category]
            return (
              <div key={b.id}
                onClick={e => { e.stopPropagation(); setModal({ block:b }) }}
                title={`${b.title}\n${hToDisplay(b.startHour)} – ${hToDisplay(b.startHour+b.duration)}`}
                style={{
                  position:'absolute', top:2, bottom:2,
                  left:`${left}%`, width:`${width}%`,
                  background: `${b.color}cc`,
                  border:`1px solid ${b.color}`,
                  borderRadius:2,
                  cursor:'pointer',
                  overflow:'hidden',
                  display:'flex', flexDirection:'column', justifyContent:'center',
                  padding:'0 4px',
                  transition:'filter 0.1s',
                  boxShadow:`0 0 8px ${b.color}44`,
                  minWidth:4,
                }}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.3)'}
                onMouseLeave={e => e.currentTarget.style.filter='none'}
              >
                {width > 4 && (
                  <div style={{
                    fontFamily:'var(--font-title)', fontSize:5, color:'var(--white)',
                    letterSpacing:0.5, lineHeight:1.3, overflow:'hidden',
                    whiteSpace:'nowrap', textOverflow:'ellipsis',
                  }}>
                    {cat?.icon} {b.title}
                  </div>
                )}
                {width > 8 && (
                  <div style={{ fontFamily:'var(--font-hud)', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                    {hToDisplay(b.startHour)}–{hToDisplay(b.startHour+b.duration)}
                  </div>
                )}
              </div>
            )
          })}

          {/* NOW marker + elapsed-day dimming (today only) */}
          {isToday && (
            <>
              <div style={{
                position:'absolute', top:0, bottom:0, left:0,
                width:`${(nowHour/24)*100}%`,
                background:'rgba(0,0,0,0.45)', pointerEvents:'none', zIndex:4,
              }} />
              <div style={{
                position:'absolute', top:0, bottom:0,
                left:`${(nowHour/24)*100}%`,
                width:2, background:'var(--yellow)',
                boxShadow:'0 0 6px var(--yellow)', pointerEvents:'none', zIndex:5,
              }}>
                <div style={{
                  position:'absolute', top:-3, left:'50%', transform:'translateX(-50%)',
                  width:7, height:7, borderRadius:'50%', background:'var(--yellow)',
                  boxShadow:'0 0 6px var(--yellow)',
                }} />
              </div>
            </>
          )}

          {/* Empty hint */}
          {blocks.length === 0 && (
            <div style={{
              position:'absolute', inset:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-hud)', fontSize:13, color:'var(--dim)', letterSpacing:2,
              pointerEvents:'none',
            }}>
              CLIC PARA AÑADIR BLOQUES DE TIEMPO
            </div>
          )}
        </div>

        {/* Category legend */}
        <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
          {BAR_CATEGORIES.map(c => {
            const hours = totals[c.key] || 0
            if (hours === 0) return null
            return (
              <div key={c.key} style={{
                display:'flex', alignItems:'center', gap:4,
                fontFamily:'var(--font-hud)', fontSize:12,
                padding:'2px 8px', border:`1px solid ${c.color}44`,
                background:`${c.color}11`,
              }}>
                <div style={{ width:8, height:8, background:c.color, flexShrink:0 }} />
                <span style={{ color:c.color }}>{c.icon} {c.label}</span>
                <span style={{ color:'var(--white)' }}>{hours < 1 ? '30m' : `${hours}h`}</span>
              </div>
            )
          })}
          {totalFree > 0 && (
            <div style={{
              display:'flex', alignItems:'center', gap:4,
              fontFamily:'var(--font-hud)', fontSize:12,
              padding:'2px 8px', border:'1px solid var(--border2)',
              color:'var(--dim)',
            }}>
              ◻ LIBRE: {totalFree}h
            </div>
          )}
        </div>
      </div>

      {/* ── QUEDA POR HACER HOY ─────────────────────────────────── */}
      {isToday && (
        <div style={{
          marginBottom:24, padding:'14px 16px',
          background:'var(--panel)', border:'2px solid var(--border2)',
          borderLeft:'4px solid var(--yellow)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10, flexWrap:'wrap', gap:8 }}>
            <span style={{ fontFamily:'var(--font-title)', fontSize:7, color:'var(--yellow)', letterSpacing:2 }}>
              ⏳ QUEDA POR HACER HOY
            </span>
            <span style={{ fontFamily:'var(--font-hud)', fontSize:16, color:'var(--white)' }}>
              {fmtHours(totalRemaining)} <span style={{ color:'var(--dim)', fontSize:12 }}>restantes</span>
            </span>
          </div>

          {totalRemaining <= 0 ? (
            <div style={{ fontFamily:'var(--font-hud)', fontSize:13, color:'var(--green)', letterSpacing:1 }}>
              ✓ DÍA COMPLETO — sin bloques pendientes
            </div>
          ) : (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {BAR_CATEGORIES
                .filter(c => (remaining[c.key] || 0) > 0)
                .sort((a,b) => remaining[b.key] - remaining[a.key])
                .map(c => (
                  <div key={c.key} style={{
                    display:'flex', alignItems:'center', gap:5,
                    fontFamily:'var(--font-hud)', fontSize:13,
                    padding:'3px 9px', border:`1px solid ${c.color}66`,
                    background:`${c.color}1a`,
                  }}>
                    <div style={{ width:8, height:8, background:c.color, flexShrink:0, boxShadow:`0 0 5px ${c.color}` }} />
                    <span style={{ color:c.color }}>{c.icon} {c.label}</span>
                    <span style={{ color:'var(--white)' }}>{fmtHours(remaining[c.key])}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── BLOCK LIST ──────────────────────────────────────────── */}
      <div>
        <div className="section-header" style={{ marginBottom:12 }}>
          <span className="section-title">// BLOQUES DEL DÍA</span>
          <span className="section-count">{blocks.length}</span>
          <div className="section-line" />
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:52, border:'1px solid var(--border2)' }}/>)}
          </div>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}>
            <div className="empty-blink">SIN BLOQUES — CLIC EN LA BARRA PARA EMPEZAR</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {sortedBlocks.map(b => {
              const cat = CAT_MAP[b.category]
              return (
                <div key={b.id}
                  onClick={() => setModal({ block:b })}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    background:'var(--panel)', border:'1px solid var(--border2)',
                    borderLeft:`4px solid ${b.color}`,
                    padding:'10px 14px', cursor:'pointer', transition:'all 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=b.color; e.currentTarget.style.background='var(--bg3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.background='var(--panel)' }}
                >
                  {/* Color dot */}
                  <div style={{ width:10, height:10, borderRadius:'50%', background:b.color, boxShadow:`0 0 6px ${b.color}`, flexShrink:0 }} />

                  {/* Icon + title */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-title)', fontSize:6, color:'var(--white)', letterSpacing:0.5 }}>
                      {cat?.icon} {b.title}
                    </div>
                    {b.taskTitle && (
                      <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', marginTop:2 }}>
                        ⚡ {b.taskTitle}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-hud)', fontSize:14, color:b.color }}>
                      {hToDisplay(b.startHour)} – {hToDisplay(b.startHour+b.duration)}
                    </div>
                    <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)' }}>
                      {b.duration<1?'30 min':b.duration===1?'1h':`${b.duration}h`}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL ───────────────────────────────────────────────── */}
      {modal && (
        <BlockModal
          block={modal.block}
          defaultStart={modal.startHour}
          defaultEnd={modal.endHour}
          tasks={tasks}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
