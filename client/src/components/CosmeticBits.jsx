import { RARITY_META } from '../lib/rpg.js'

export function CoinIcon({ size = 14 }) {
  return <span style={{ fontSize: size, lineHeight: 1 }}>🪙</span>
}

// Visual preview of a cosmetic, varies by slot type.
export function CosmeticPreview({ item, size = 40 }) {
  const t = item.type
  const d = item.data || {}
  if (t === 'avatar') {
    return <div style={{ fontSize: size }}>{d.glyph}</div>
  }
  if (t === 'badge') {
    return <div style={{ fontSize: size }}>{d.glyph}</div>
  }
  if (t === 'frame') {
    return (
      <div className={`cos-frame ${d.className || ''}`} style={{ width: size + 8, height: size + 8, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize: size * 0.55 }}>⚔️</span>
      </div>
    )
  }
  if (t === 'theme') {
    return (
      <div style={{
        width: size + 6, height: size + 6, borderRadius: 4,
        background: d.accent || '#ffdd00', boxShadow: d.glow || 'none',
        border: '2px solid rgba(255,255,255,0.2)'
      }} />
    )
  }
  // title
  return (
    <div style={{
      fontFamily:'var(--font-title)', fontSize: 6, letterSpacing: 1,
      color:'var(--white)', textAlign:'center', lineHeight: 1.7, padding:'0 4px'
    }}>{d.text}</div>
  )
}

export function RarityTag({ rarity }) {
  const m = RARITY_META[rarity] || RARITY_META.common
  return (
    <span style={{
      fontFamily:'var(--font-title)', fontSize: 5, letterSpacing: 1,
      color: m.color, textShadow: m.glow,
    }}>{m.label}</span>
  )
}
