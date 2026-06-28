import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { api, ApiError } from '../lib/api.js'
import { RARITY_META, SLOT_LABELS } from '../lib/rpg.js'
import { CosmeticPreview, RarityTag } from './CosmeticBits.jsx'

const SLOT_ORDER = ['title','avatar','frame','badge','theme']

export default function VaultPage({ onProfileChange }) {
  const [items, setItems]       = useState([])
  const [equipped, setEquipped] = useState({})
  const [loading, setLoading]   = useState(true)
  const [busy, setBusy]         = useState(null)

  const load = useCallback(async () => {
    try {
      const { items, equipped } = await api.inventory.list()
      setItems(items); setEquipped(equipped || {})
    } catch {
      toast.error('Error al cargar la bóveda', { className:'rpg-toast' })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (item) => {
    setBusy(item.id)
    try {
      if (item.equipped) {
        await api.shop.unequip(item.type)
        toast.success(`Desequipado: ${item.name}`, { className:'rpg-toast' })
      } else {
        await api.shop.equip(item.id)
        toast.success(`Equipado: ${item.name}`, { className:'rpg-toast' })
      }
      await load()
      onProfileChange?.()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error', { className:'rpg-toast' })
    } finally { setBusy(null) }
  }

  const bySlot = SLOT_ORDER.map(slot => ({ slot, list: items.filter(i => i.type === slot) }))
                           .filter(g => g.list.length > 0)

  return (
    <div className="vault-page" style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {loading ? (
        <div className="skill-grid">
          {Array.from({length:4}).map((_,i)=>(<div key={i} className="skeleton skeleton-card" style={{ animationDelay:`${i*0.1}s` }} />))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 16px', color:'var(--dim)', fontFamily:'var(--font-hud)', fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎒</div>
          Tu bóveda está vacía. Visita la <span style={{ color:'var(--yellow)' }}>TIENDA</span> o completa misiones para conseguir botín.
        </div>
      ) : (
        bySlot.map(({ slot, list }) => (
          <div key={slot}>
            <div className="section-header">
              <span className="section-title">// {SLOT_LABELS[slot]}</span>
              <div className="section-line" />
            </div>
            <div className="shop-grid">
              {list.map(item => {
                const m = RARITY_META[item.rarity] || RARITY_META.common
                return (
                  <div key={item.id} className="shop-card" style={{ borderColor: item.equipped ? 'var(--green)' : `${m.color}55` }}>
                    {item.source === 'loot' && <div className="loot-tag">★ BOTÍN</div>}
                    <div className="shop-card-preview" style={{ boxShadow: item.rarity==='legendary' ? m.glow : 'none' }}>
                      <CosmeticPreview item={item} size={44} />
                    </div>
                    <div className="shop-card-name">{item.name}</div>
                    <div style={{ marginTop:2 }}><RarityTag rarity={item.rarity} /></div>
                    <div style={{ marginTop:10 }}>
                      <button className={`btn ${item.equipped ? '' : 'btn-yellow'}`}
                        style={{ width:'100%', fontSize:5, ...(item.equipped ? { color:'var(--green)', borderColor:'var(--green)' } : {}) }}
                        disabled={busy===item.id} onClick={() => toggle(item)}>
                        {item.equipped ? '✓ EQUIPADO' : 'EQUIPAR'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
