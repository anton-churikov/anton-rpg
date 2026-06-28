import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { api } from '../lib/api.js'

// ── CATEGORIES (keys mirror server TIME_CATEGORIES) ───────────────────────────
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

// ── MAIN — HOURS DISTRIBUTION PANEL ───────────────────────────────────────────
export default function TimeManagementPage({ profile, onProfileChange }) {
  const [hours, setHours]   = useState({})
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty]   = useState(false)

  // Initialise the editable copy from the saved profile
  useEffect(() => {
    setHours({ ...(profile?.recommendedHours || {}) })
    setDirty(false)
  }, [profile?.recommendedHours])

  const setCat = (key, val) => {
    const v = Math.max(0, Math.min(MAX_CAT, Math.round(val * 2) / 2)) // snap 30 min
    setHours(h => {
      const next = { ...h }
      if (v > 0) next[key] = v; else delete next[key]
      return next
    })
    setDirty(true)
  }
  const bump = (key, delta) => setCat(key, (hours[key] || 0) + delta)

  const totalAllocated = BAR_CATEGORIES.reduce((s, c) => s + (hours[c.key] || 0), 0)
  const totalFree = Math.max(0, DAY_HOURS - totalAllocated)
  const over = totalAllocated > DAY_HOURS

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.player.setRecommendedHours(hours)
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
            Reparte tus horas ideales por categoría. No es un horario — solo cuántas horas
            quieres dedicar a cada cosa. Aparecerán en el calendario como meta diaria.
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
        {BAR_CATEGORIES.filter(c => (hours[c.key] || 0) > 0).map(c => (
          <div key={c.key}
            title={`${c.label}: ${fmtHours(hours[c.key])}`}
            style={{
              width:`${((hours[c.key] || 0) / DAY_HOURS) * 100}%`,
              background:`${c.color}cc`, borderRight:'1px solid rgba(0,0,0,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center', minWidth:2,
              fontSize:13, overflow:'hidden', boxShadow:`inset 0 0 12px ${c.color}66`,
            }}>
            {((hours[c.key] || 0) / DAY_HOURS) > 0.06 && <span>{c.icon}</span>}
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
        <span className="section-title">// HORAS POR CATEGORÍA</span>
        <div className="section-line" />
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {BAR_CATEGORIES.map(c => {
          const val = hours[c.key] || 0
          const pct = totalAllocated > 0 ? Math.round((val / totalAllocated) * 100) : 0
          return (
            <div key={c.key} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'var(--panel)', border:'1px solid var(--border2)',
              borderLeft:`4px solid ${c.color}`, padding:'10px 14px',
            }}>
              {/* Icon + label */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'var(--font-title)', fontSize:6, color:'var(--white)', letterSpacing:0.5 }}>
                  {c.icon} {c.label}
                </div>
                {val > 0 && (
                  <div style={{ fontFamily:'var(--font-hud)', fontSize:11, color:'var(--dim)', marginTop:3 }}>
                    {pct}% del plan
                  </div>
                )}
              </div>

              {/* Stepper */}
              <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                <button className="btn btn-ghost btn-sm" style={{ minWidth:34 }}
                  onClick={() => bump(c.key, -STEP)} disabled={val <= 0}>−</button>
                <div style={{
                  fontFamily:'var(--font-hud)', fontSize:15, minWidth:64, textAlign:'center',
                  color: val > 0 ? c.color : 'var(--dim)',
                }}>
                  {val > 0 ? fmtHours(val) : '—'}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ minWidth:34 }}
                  onClick={() => bump(c.key, STEP)} disabled={val >= MAX_CAT}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
