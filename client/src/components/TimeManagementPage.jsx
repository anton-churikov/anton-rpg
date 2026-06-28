import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api.js'
import { getCategories, CATEGORY_PALETTE, newCategoryId } from '../lib/categories.js'

const DAY_HOURS = 24
const STEP = 0.5
const MAX_CAT = 24

// Format a fractional-hour amount as "2h", "45m", or "1h 30m"
export function fmtHours(h) {
  if (!h || h <= 0) return '0h'
  const whole = Math.floor(h)
  const mins  = Math.round((h - whole) * 60)
  if (whole === 0) return `${mins}m`
  if (mins === 0)  return `${whole}h`
  return `${whole}h ${mins}m`
}

// ── CATEGORY EDITOR MODAL ─────────────────────────────────────────────────────
function CategoryModal({ category, onSave, onDelete, onClose }) {
  const isEdit = !!category
  const [label, setLabel] = useState(category?.label || '')
  const [color, setColor] = useState(category?.color || CATEGORY_PALETTE[0])
  const [icon,  setIcon]  = useState(category?.icon  || '')

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const save = () => {
    const name = label.trim()
    if (!name) { toast.error('Nombre obligatorio', { className:'rpg-toast' }); return }
    onSave({ id: category?.id || newCategoryId(), label: name, color, icon: icon.trim() })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit ? '▶ EDITAR CATEGORÍA' : '▶ NUEVA CATEGORÍA'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ gap: 14 }}>
          {/* Preview */}
          <div style={{
            display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
            border:`1px solid ${color}66`, background:`${color}1a`,
          }}>
            <div style={{ width:10, height:10, background:color, boxShadow:`0 0 6px ${color}` }} />
            <span style={{ fontFamily:'var(--font-hud)', fontSize:14, color }}>
              {icon} {label.trim() || 'Vista previa'}
            </span>
          </div>

          {/* Name + emoji */}
          <div className="form-row">
            <div className="form-group" style={{ flex:1 }}>
              <label className="form-label">NOMBRE</label>
              <input className="form-input" value={label} maxLength={40} autoFocus
                onChange={e => setLabel(e.target.value)} placeholder="Programar, Leer, Música..." />
            </div>
            <div className="form-group" style={{ width:80 }}>
              <label className="form-label">EMOJI</label>
              <input className="form-input" value={icon} maxLength={4}
                onChange={e => setIcon(e.target.value)} placeholder="🎯"
                style={{ textAlign:'center' }} />
            </div>
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">COLOR</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {CATEGORY_PALETTE.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} title={c}
                  style={{
                    width:28, height:28, background:c, cursor:'pointer', borderRadius:2,
                    border: color === c ? '3px solid var(--white)' : '2px solid transparent',
                    boxShadow: color === c ? `0 0 8px ${c}` : 'none',
                  }} />
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {isEdit && (
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(category.id)}>✕ ELIMINAR</button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>CANCELAR</button>
          <button className="btn btn-yellow" onClick={save}>{isEdit ? '▶ GUARDAR' : '▶ AÑADIR'}</button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN — HOURS DISTRIBUTION PANEL ───────────────────────────────────────────
export default function TimeManagementPage({ profile, onProfileChange }) {
  const [categories, setCategories] = useState([])
  const [hours, setHours]   = useState({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)
  const [catModal, setCatModal] = useState(null) // null | 'new' | category object

  // Initialise editable copies from the saved profile
  useEffect(() => {
    setCategories(getCategories(profile).map(c => ({ ...c })))
    setHours({ ...(profile?.recommendedHours || {}) })
    setDirty(false)
  }, [profile?.timeCategories, profile?.recommendedHours])

  const setCat = (id, val) => {
    const v = Math.max(0, Math.min(MAX_CAT, Math.round(val * 2) / 2)) // snap 30 min
    setHours(h => {
      const next = { ...h }
      if (v > 0) next[id] = v; else delete next[id]
      return next
    })
    setDirty(true)
  }
  const bump = (id, delta) => setCat(id, (hours[id] || 0) + delta)

  const saveCategory = (cat) => {
    setCategories(list => {
      const exists = list.some(c => c.id === cat.id)
      return exists ? list.map(c => c.id === cat.id ? cat : c) : [...list, cat]
    })
    setDirty(true)
    setCatModal(null)
  }

  const deleteCategory = (id) => {
    setCategories(list => list.filter(c => c.id !== id))
    setHours(h => { const n = { ...h }; delete n[id]; return n })
    setDirty(true)
    setCatModal(null)
  }

  const totalAllocated = categories.reduce((s, c) => s + (hours[c.id] || 0), 0)
  const totalFree = Math.max(0, DAY_HOURS - totalAllocated)
  const over = totalAllocated > DAY_HOURS

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.player.setTimeCategories(categories)
      // Drop hours whose category was removed
      const validIds = new Set(categories.map(c => c.id))
      const cleanHours = Object.fromEntries(Object.entries(hours).filter(([k]) => validIds.has(k)))
      const updated = await api.player.setRecommendedHours(cleanHours)
      onProfileChange?.(updated)
      setDirty(false)
      toast('✓ DISTRIBUCIÓN GUARDADA', { className:'rpg-toast' })
    } catch (e) {
      toast.error(e.message || 'Error al guardar', { className:'rpg-toast' })
    } finally { setSaving(false) }
  }

  return (
    <div>
      {/* ── HEADER + SAVE ───────────────────────────────────────── */}
      <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom:18, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:200 }}>
          <div style={{ fontFamily:'var(--font-title)', fontSize:8, color:'var(--cyan)', letterSpacing:2 }}>
            DISTRIBUCIÓN DE HORAS RECOMENDADAS
          </div>
          <div style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--dim)', marginTop:5, lineHeight:1.5 }}>
            Crea las categorías a las que dedicas tu tiempo y reparte tus horas ideales en cada una.
            Aparecerán en el calendario como meta diaria.
          </div>
        </div>
        <button className="btn btn-yellow btn-sm" style={{ flexShrink:0 }}
          onClick={handleSave} disabled={saving || !dirty}>
          {saving ? '...' : dirty ? '▶ GUARDAR' : '✓ GUARDADO'}
        </button>
      </div>

      {/* ── DISTRIBUTION BAR ────────────────────────────────────── */}
      <div style={{ marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontFamily:'var(--font-title)', fontSize:7, color:'var(--cyan)', letterSpacing:2 }}>
          REPARTO DEL DÍA — 24H
        </span>
        <span style={{ fontFamily:'var(--font-hud)', fontSize:13 }}>
          <span style={{ color: over ? 'var(--orange)' : 'var(--white)' }}>{fmtHours(totalAllocated)} asignadas</span>
          &nbsp;·&nbsp;
          <span style={{ color: totalFree > 0 ? 'var(--green)' : 'var(--dim)' }}>{fmtHours(totalFree)} libres</span>
        </span>
      </div>

      <div style={{
        display:'flex', height:42, marginBottom:6,
        background:'var(--bg3)', border:'2px solid var(--border2)', overflow:'hidden',
      }}>
        {categories.filter(c => (hours[c.id] || 0) > 0).map(c => (
          <div key={c.id}
            title={`${c.label}: ${fmtHours(hours[c.id])}`}
            style={{
              width:`${((hours[c.id] || 0) / DAY_HOURS) * 100}%`,
              background:`${c.color}cc`, borderRight:'1px solid rgba(0,0,0,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center', minWidth:2,
              fontSize:13, overflow:'hidden', boxShadow:`inset 0 0 12px ${c.color}66`,
            }}>
            {((hours[c.id] || 0) / DAY_HOURS) > 0.06 && <span>{c.icon}</span>}
          </div>
        ))}
        {totalFree > 0 && (
          <div style={{
            width:`${(totalFree / DAY_HOURS) * 100}%`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', letterSpacing:1,
          }}>
            {totalFree >= 2 ? 'LIBRE' : ''}
          </div>
        )}
      </div>

      {over && (
        <div style={{ fontFamily:'var(--font-hud)', fontSize:12, color:'var(--orange)', marginBottom:14 }}>
          ⚠ Has asignado más de 24h al día ({fmtHours(totalAllocated)}).
        </div>
      )}

      {/* ── CATEGORY EDITORS ────────────────────────────────────── */}
      <div className="section-header" style={{ margin:'18px 0 12px' }}>
        <span className="section-title">// CATEGORÍAS</span>
        <span className="section-count">{categories.length}</span>
        <div className="section-line" />
        <button className="btn btn-ghost btn-sm" onClick={() => setCatModal('new')}>+ NUEVA</button>
      </div>

      {categories.length === 0 ? (
        <div style={{ textAlign:'center', padding:'28px 0', fontFamily:'var(--font-hud)', color:'var(--dim)', letterSpacing:1 }}>
          SIN CATEGORÍAS — PULSA «+ NUEVA» PARA EMPEZAR
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {categories.map(c => {
            const val = hours[c.id] || 0
            const pct = totalAllocated > 0 ? Math.round((val / totalAllocated) * 100) : 0
            return (
              <div key={c.id} style={{
                display:'flex', alignItems:'center', gap:12,
                background:'var(--panel)', border:'1px solid var(--border2)',
                borderLeft:`4px solid ${c.color}`, padding:'10px 14px',
              }}>
                {/* Icon + label (click to edit) */}
                <div style={{ flex:1, minWidth:0, cursor:'pointer' }} onClick={() => setCatModal(c)}
                  title="Editar categoría">
                  <div style={{ fontFamily:'var(--font-title)', fontSize:6, color:'var(--white)', letterSpacing:0.5 }}>
                    {c.icon} {c.label}
                  </div>
                  <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', marginTop:3 }}>
                    {val > 0 ? `${pct}% del plan` : 'editar'} · ✎
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <button className="btn btn-ghost btn-sm" style={{ minWidth:34 }}
                    onClick={() => bump(c.id, -STEP)} disabled={val <= 0}>−</button>
                  <div style={{
                    fontFamily:'var(--font-hud)', fontSize:15, minWidth:64, textAlign:'center',
                    color: val > 0 ? c.color : 'var(--dim)',
                  }}>
                    {val > 0 ? fmtHours(val) : '—'}
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ minWidth:34 }}
                    onClick={() => bump(c.id, STEP)} disabled={val >= MAX_CAT}>+</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {catModal && (
        <CategoryModal
          category={catModal === 'new' ? null : catModal}
          onSave={saveCategory}
          onDelete={deleteCategory}
          onClose={() => setCatModal(null)}
        />
      )}
    </div>
  )
}
