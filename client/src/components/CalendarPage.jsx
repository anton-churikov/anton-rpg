import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api.js'

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const EVENT_COLORS = [
  { value: '#1a6bff', label: 'Azul' },
  { value: '#00d4ff', label: 'Cyan' },
  { value: '#00ff66', label: 'Verde' },
  { value: '#ffdd00', label: 'Amarillo' },
  { value: '#ff7700', label: 'Naranja' },
  { value: '#ff2244', label: 'Rojo' },
  { value: '#aa44ff', label: 'Violeta' },
  { value: '#ff69b4', label: 'Rosa' },
]

const HOUR_HEIGHT = 60 // px per hour

// Time categories — mirror of TimeManagementPage / server TIME_CATEGORIES
const TIME_CATEGORIES = [
  { key:'sleep',   label:'SUEÑO',      color:'#4444aa', icon:'🌙' },
  { key:'work',    label:'TRABAJO',     color:'#1a6bff', icon:'💼' },
  { key:'study',   label:'ESTUDIO',     color:'#aa44ff', icon:'📚' },
  { key:'fitness', label:'EJERCICIO',   color:'#00ff66', icon:'💪' },
  { key:'hobby',   label:'HOBBY',       color:'#ff7700', icon:'🎮' },
  { key:'social',  label:'SOCIAL',      color:'#ff69b4', icon:'👥' },
  { key:'rest',    label:'DESCANSO',    color:'#00d4ff', icon:'☕' },
  { key:'other',   label:'OTRO',        color:'#888888', icon:'◉'  },
]
const CAT_MAP = Object.fromEntries(TIME_CATEGORIES.map(c => [c.key, c]))

function fmtHrs(h) {
  if (!h || h <= 0) return '0h'
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  if (whole === 0) return `${mins}m`
  if (mins === 0)  return `${whole}h`
  return `${whole}h ${mins}m`
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7)) // week starts Monday
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return date
  })
}

function toDateStr(date) {
  return date.toISOString().split('T')[0]
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

function formatHour(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function formatTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function snapTo15(minutes) {
  return Math.round(minutes / 15) * 15
}

// ── EVENT MODAL ───────────────────────────────────────────────────────────────
function EventModal({ event, defaultDate, defaultStart, defaultEnd, skills, quests, onSave, onDelete, onClose }) {
  const isEdit = !!event
  const [form, setForm] = useState({
    title:          event?.title          || '',
    description:    event?.description    || '',
    date:           event?.date           || defaultDate || toDateStr(new Date()),
    startTime:      event?.startTime      || defaultStart || '09:00',
    endTime:        event?.endTime        || defaultEnd   || '10:00',
    color:          event?.color          || '#1a6bff',
    category:       event?.category       || '',
    relatedSkillId: event?.relatedSkillId || '',
    relatedQuestId: event?.relatedQuestId || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const set = (f, v) => { setForm(p => ({...p, [f]: v})); setErrors(e => ({...e, [f]: undefined})) }

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'El título es obligatorio'
    if (!form.date)          errs.date  = 'La fecha es obligatoria'
    if (!form.startTime)    errs.startTime = 'Hora de inicio obligatoria'
    if (!form.endTime)      errs.endTime = 'Hora de fin obligatoria'
    if (form.startTime >= form.endTime) errs.endTime = 'La hora de fin debe ser posterior'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      ...form,
      category:       form.category || null,
      relatedSkillId: form.relatedSkillId || null,
      relatedQuestId: form.relatedQuestId || null,
    }, event?.id)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(event.id)
    setDeleting(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? '▶ EDITAR EVENTO' : '▶ NUEVO EVENTO'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: 12 }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">TÍTULO <span className="req">*</span></label>
            <input
              className={`form-input ${errors.title ? 'err' : ''}`}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Reunión, sesión de estudio, ejercicio..."
              autoFocus
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">FECHA <span className="req">*</span></label>
            <input
              type="date"
              className={`form-input ${errors.date ? 'err' : ''}`}
              value={form.date}
              onChange={e => set('date', e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            {errors.date && <span className="form-error">{errors.date}</span>}
          </div>

          {/* Time range */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">INICIO <span className="req">*</span></label>
              <input
                type="time"
                className={`form-input ${errors.startTime ? 'err' : ''}`}
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              {errors.startTime && <span className="form-error">{errors.startTime}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">FIN <span className="req">*</span></label>
              <input
                type="time"
                className={`form-input ${errors.endTime ? 'err' : ''}`}
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
              {errors.endTime && <span className="form-error">{errors.endTime}</span>}
            </div>
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="form-label">COLOR</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set('color', c.value)}
                  title={c.label}
                  style={{
                    width: 28, height: 28,
                    background: c.value,
                    border: form.color === c.value ? '3px solid var(--white)' : '2px solid transparent',
                    borderRadius: 2,
                    cursor: 'pointer',
                    boxShadow: form.color === c.value ? `0 0 8px ${c.value}` : 'none',
                    transition: 'all 0.1s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Category — counts toward the recommended daily distribution */}
          <div className="form-group">
            <label className="form-label">CATEGORÍA</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TIME_CATEGORIES.map(c => {
                const active = form.category === c.key
                return (
                  <button key={c.key} type="button"
                    onClick={() => set('category', active ? '' : c.key)}
                    style={{
                      fontFamily:'var(--font-hud)', fontSize:12, cursor:'pointer',
                      padding:'4px 9px', color: active ? '#000' : c.color,
                      background: active ? c.color : `${c.color}1a`,
                      border:`1px solid ${c.color}${active ? '' : '66'}`,
                      transition:'all 0.1s',
                    }}>
                    {c.icon} {c.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">DESCRIPCIÓN</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Notas, objetivos, agenda..."
              style={{ minHeight: 56 }}
            />
          </div>

          {/* Linked skill */}
          {skills.length > 0 && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">HABILIDAD</label>
                <select className="form-select" value={form.relatedSkillId} onChange={e => set('relatedSkillId', e.target.value)}>
                  <option value="">— NINGUNA —</option>
                  {skills.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {quests.length > 0 && (
                <div className="form-group">
                  <label className="form-label">QUEST</label>
                  <select className="form-select" value={form.relatedQuestId} onChange={e => set('relatedQuestId', e.target.value)}>
                    <option value="">— NINGUNA —</option>
                    {quests.filter(q => q.status === 'active').map(q => <option key={q.id} value={q.id}>{q.title.slice(0, 30)}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {isEdit && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? '...' : '✕ ELIMINAR'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>CANCELAR</button>
          <button className="btn btn-yellow" onClick={handleSave} disabled={saving}>
            {saving ? '...' : isEdit ? '▶ GUARDAR' : '▶ CREAR'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CALENDAR EVENT BLOCK ──────────────────────────────────────────────────────
function EventBlock({ event, onClick }) {
  const startMin = timeToMinutes(event.startTime)
  const endMin   = timeToMinutes(event.endTime)
  const top      = (startMin / 60) * HOUR_HEIGHT
  const height   = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 20)
  const short    = height < 36

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event) }}
      style={{
        position: 'absolute',
        top: top + 1,
        left: 2,
        right: 2,
        height: height - 2,
        background: event.color + '22',
        border: `1px solid ${event.color}`,
        borderLeft: `3px solid ${event.color}`,
        borderRadius: 2,
        padding: short ? '1px 4px' : '3px 6px',
        cursor: 'pointer',
        overflow: 'hidden',
        zIndex: 2,
        transition: 'filter 0.1s',
        boxSizing: 'border-box',
      }}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.3)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
    >
      <div style={{
        fontFamily: 'var(--font-title)',
        fontSize: 5,
        color: event.color,
        letterSpacing: 0.5,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {event.title}
      </div>
      {!short && (
        <div style={{
          fontFamily: 'var(--font-hud)',
          fontSize: 10,
          color: 'var(--dim)',
          lineHeight: 1.2,
        }}>
          {formatTime(event.startTime)} – {formatTime(event.endTime)}
        </div>
      )}
    </div>
  )
}

// ── MAIN CALENDAR COMPONENT ───────────────────────────────────────────────────
export default function CalendarPage({ skills, quests, profile }) {
  const [events, setEvents]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView]           = useState('week') // 'week' | 'day'
  const [modalData, setModalData] = useState(null) // null | { event?, date, startTime, endTime }
  const gridRef = useRef(null)

  const weekDates = getWeekDates(currentDate)
  const weekStart = toDateStr(weekDates[0])
  const weekEnd   = toDateStr(weekDates[6])

  // Fetch events for visible range
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const start = view === 'week' ? weekStart : toDateStr(currentDate)
      const end   = view === 'week' ? weekEnd   : toDateStr(currentDate)
      const data  = await api.events.list(start, end)
      setEvents(data)
    } catch {
      toast.error('Error al cargar eventos', { className: 'rpg-toast' })
    } finally {
      setLoading(false)
    }
  }, [weekStart, weekEnd, view, currentDate])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  // Scroll to 8am on mount
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = 8 * HOUR_HEIGHT - 20
    }
  }, [])

  const handleSave = async (formData, id) => {
    try {
      const saved = id
        ? await api.events.update(id, formData)
        : await api.events.create(formData)
      if (id) {
        setEvents(ev => ev.map(e => e.id === id ? saved : e))
        toast('✓ EVENTO ACTUALIZADO', { className: 'rpg-toast' })
      } else {
        setEvents(ev => [...ev, saved])
        toast('✓ EVENTO CREADO', { className: 'rpg-toast' })
      }
      setModalData(null)
    } catch (e) {
      toast.error(e.message || 'Error', { className: 'rpg-toast' })
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.events.delete(id)
      setEvents(ev => ev.filter(e => e.id !== id))
      toast('EVENTO ELIMINADO', { className: 'rpg-toast' })
      setModalData(null)
    } catch {
      toast.error('Error al eliminar', { className: 'rpg-toast' })
    }
  }

  // Click on grid to create event
  const handleGridClick = (e, dateStr) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y    = e.clientY - rect.top + e.currentTarget.parentElement.scrollTop
    const minutesRaw = (y / HOUR_HEIGHT) * 60
    const startMin   = snapTo15(minutesRaw)
    const endMin     = startMin + 60
    setModalData({
      date:      dateStr,
      startTime: minutesToTime(Math.min(startMin, 23 * 60)),
      endTime:   minutesToTime(Math.min(endMin, 24 * 60 - 1)),
    })
  }

  const eventsForDate = (dateStr) =>
    events.filter(e => e.date === dateStr)

  const today = toDateStr(new Date())

  const goBack = () => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() - 7)
    else d.setDate(d.getDate() - 1)
    setCurrentDate(d)
  }

  const goForward = () => {
    const d = new Date(currentDate)
    if (view === 'week') d.setDate(d.getDate() + 7)
    else d.setDate(d.getDate() + 1)
    setCurrentDate(d)
  }

  const goToday = () => setCurrentDate(new Date())

  const displayDates = view === 'week' ? weekDates : [currentDate]

  const headerLabel = view === 'week'
    ? (() => {
        const s = weekDates[0]; const e = weekDates[6]
        if (s.getMonth() === e.getMonth())
          return `${MONTHS_ES[s.getMonth()]} ${s.getFullYear()}`
        return `${MONTHS_ES[s.getMonth()]} – ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`
      })()
    : `${DAYS_ES[currentDate.getDay()]} ${currentDate.getDate()} ${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`

  // Recommended (from Tiempo) vs scheduled hours for the day in view
  const recommended = profile?.recommendedHours || {}
  const dayStr = toDateStr(currentDate)
  const scheduledByCat = {}
  for (const e of events) {
    if (e.date !== dayStr || !e.category) continue
    const hrs = Math.max(0, (timeToMinutes(e.endTime) - timeToMinutes(e.startTime)) / 60)
    scheduledByCat[e.category] = (scheduledByCat[e.category] || 0) + hrs
  }
  const planRows = TIME_CATEGORIES
    .map(c => ({ ...c, rec: recommended[c.key] || 0, prog: scheduledByCat[c.key] || 0 }))
    .filter(r => r.rec > 0 || r.prog > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── TOOLBAR ───────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        {/* Today button */}
        <button className="btn btn-ghost btn-sm" onClick={goToday}>HOY</button>

        {/* Nav arrows */}
        <div style={{ display: 'flex', gap: 0 }}>
          <button className="btn btn-ghost btn-sm" style={{ borderRight: 'none', borderRadius: '3px 0 0 3px' }} onClick={goBack}>◀</button>
          <button className="btn btn-ghost btn-sm" style={{ borderRadius: '0 3px 3px 0' }} onClick={goForward}>▶</button>
        </div>

        {/* Month label */}
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 8, color: 'var(--yellow)', letterSpacing: 1, textShadow: 'var(--glow-yellow)' }}>
          {headerLabel}
        </div>

        {/* View toggle */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 0 }}>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>SEMANA</button>
            <button className={`view-btn ${view === 'day'  ? 'active' : ''}`} onClick={() => setView('day')}>DÍA</button>
          </div>
          <button
            className="btn btn-yellow btn-sm"
            style={{ marginLeft: 10 }}
            onClick={() => setModalData({ date: today, startTime: '09:00', endTime: '10:00' })}
          >
            + EVENTO
          </button>
        </div>
      </div>

      {/* ── RECOMENDADO vs PROGRAMADO (day view) ──────────────── */}
      {view === 'day' && planRows.length > 0 && (
        <div style={{
          marginBottom:14, padding:'12px 14px',
          background:'var(--panel)', border:'1px solid var(--border2)',
          borderLeft:'4px solid var(--cyan)',
        }}>
          <div style={{ fontFamily:'var(--font-title)', fontSize:7, color:'var(--cyan)', letterSpacing:2, marginBottom:10 }}>
            ⏱ RECOMENDADO vs PROGRAMADO
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {planRows.map(r => {
              const remaining = Math.max(0, r.rec - r.prog)
              const done = r.rec > 0 && remaining <= 0
              return (
                <div key={r.key} style={{
                  display:'flex', flexDirection:'column', gap:3, minWidth:128,
                  padding:'7px 10px', border:`1px solid ${r.color}55`, background:`${r.color}12`,
                }}>
                  <div style={{ fontFamily:'var(--font-hud)', fontSize:12, color:r.color }}>
                    {r.icon} {r.label}
                  </div>
                  <div style={{ fontFamily:'var(--font-hud)', fontSize:14, color:'var(--white)' }}>
                    {fmtHrs(r.prog)}{r.rec > 0 && <span style={{ color:'var(--dim)' }}> / {fmtHrs(r.rec)}</span>}
                  </div>
                  {r.rec > 0 && (
                    <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color: done ? 'var(--green)' : 'var(--orange)' }}>
                      {done ? '✓ completo' : `quedan ${fmtHrs(remaining)}`}
                    </div>
                  )}
                  {r.rec === 0 && (
                    <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)' }}>sin meta</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CALENDAR GRID ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border2)', background: 'var(--bg2)' }}>

        {/* Day headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border2)', flexShrink: 0 }}>
          {/* Time gutter spacer */}
          <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--border2)' }} />
          {displayDates.map(date => {
            const ds     = toDateStr(date)
            const isToday = ds === today
            const dayEvs  = eventsForDate(ds)
            return (
              <div key={ds} style={{
                flex: 1,
                padding: '8px 4px',
                textAlign: 'center',
                borderRight: '1px solid var(--border2)',
                background: isToday ? 'rgba(26,107,255,0.08)' : 'transparent',
              }}>
                <div style={{ fontFamily: 'var(--font-hud)', fontSize: 11, color: 'var(--dim)', letterSpacing: 1 }}>
                  {DAYS_SHORT[date.getDay()]}
                </div>
                <div style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: isToday ? 11 : 10,
                  color: isToday ? 'var(--cyan)' : 'var(--white)',
                  textShadow: isToday ? 'var(--glow-cyan)' : 'none',
                  marginTop: 2,
                }}>
                  {date.getDate()}
                </div>
                {dayEvs.length > 0 && (
                  <div style={{ fontFamily: 'var(--font-hud)', fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {dayEvs.length} ev.
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={gridRef} style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          <div style={{ display: 'flex', position: 'relative' }}>

            {/* Hour labels */}
            <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid var(--border2)', background: 'var(--bg2)' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--border2)', display: 'flex', alignItems: 'flex-start', paddingTop: 4, paddingRight: 6, justifyContent: 'flex-end' }}>
                  {h > 0 && (
                    <span style={{ fontFamily: 'var(--font-hud)', fontSize: 10, color: 'var(--dim)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                      {formatHour(h)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {displayDates.map(date => {
              const ds      = toDateStr(date)
              const isToday = ds === today
              const dayEvs  = eventsForDate(ds)

              return (
                <div key={ds} style={{ flex: 1, borderRight: '1px solid var(--border2)', position: 'relative', background: isToday ? 'rgba(26,107,255,0.03)' : 'transparent' }}>
                  {/* Hour grid lines */}
                  {HOURS.map(h => (
                    <div
                      key={h}
                      style={{ height: HOUR_HEIGHT, borderBottom: '1px solid var(--border2)', position: 'relative', cursor: 'crosshair' }}
                      onClick={e => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        const y    = e.clientY - rect.top
                        const frac = y / HOUR_HEIGHT
                        const totalMin = h * 60 + frac * 60
                        const startMin = snapTo15(totalMin)
                        const endMin   = startMin + 60
                        setModalData({
                          date: ds,
                          startTime: minutesToTime(Math.min(startMin, 23 * 60)),
                          endTime:   minutesToTime(Math.min(endMin,   23 * 60 + 59)),
                        })
                      }}
                    >
                      {/* Half-hour line */}
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.04)' }} />
                    </div>
                  ))}

                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date()
                    const min = now.getHours() * 60 + now.getMinutes()
                    const top = (min / 60) * HOUR_HEIGHT
                    return (
                      <div style={{ position: 'absolute', left: 0, right: 0, top, zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', boxShadow: 'var(--glow-cyan)', flexShrink: 0 }} />
                          <div style={{ flex: 1, height: 1, background: 'var(--cyan)', opacity: 0.6 }} />
                        </div>
                      </div>
                    )
                  })()}

                  {/* Events */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {dayEvs.map(ev => (
                      <div key={ev.id} style={{ pointerEvents: 'all' }}>
                        <EventBlock event={ev} onClick={ev => setModalData({ event: ev })} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── MODAL ─────────────────────────────────────────────── */}
      {modalData && (
        <EventModal
          event={modalData.event}
          defaultDate={modalData.date}
          defaultStart={modalData.startTime}
          defaultEnd={modalData.endTime}
          skills={skills}
          quests={quests}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}
