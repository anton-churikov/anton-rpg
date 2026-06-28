import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { api, ApiError } from '../lib/api.js'
import { RARITY_META, SLOT_LABELS } from '../lib/rpg.js'
import { CoinIcon, CosmeticPreview, RarityTag } from './CosmeticBits.jsx'

const TABS = [
  { key:'all',    label:'TODO'    },
  { key:'title',  label:'TÍTULOS' },
  { key:'avatar', label:'AVATARES'},
  { key:'frame',  label:'MARCOS'  },
  { key:'badge',  label:'INSIGNIAS'},
  { key:'theme',  label:'TEMAS'   },
]

export default function ShopPage({ onProfileChange }) {
  const [coins, setCoins]     = useState(0)
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('all')
  const [busy, setBusy]       = useState(null)

  const load = useCallback(async () => {
    try {
      const { coins, catalog } = await api.shop.catalog()
      setCoins(coins); setCatalog(catalog)
    } catch {
      toast.error('Error al cargar la tienda', { className:'rpg-toast' })
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const buy = async (item) => {
    setBusy(item.id)
    try {
      const { coins } = await api.shop.buy(item.id)
      setCoins(coins)
      toast.success(`Comprado: ${item.name}`, { className:'rpg-toast' })
      await load()
      onProfileChange?.()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al comprar', { className:'rpg-toast' })
    } finally { setBusy(null) }
  }

  const equip = async (item) => {
    setBusy(item.id)
    try {
      await api.shop.equip(item.id)
      toast.success(`Equipado: ${item.name}`, { className:'rpg-toast' })
      await load()
      onProfileChange?.()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al equipar', { className:'rpg-toast' })
    } finally { setBusy(null) }
  }

  const shown = tab === 'all' ? catalog : catalog.filter(c => c.type === tab)

  return (
    <div className="shop-page" style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Coin balance banner */}
      <div className="shop-balance">
        <div style={{ fontFamily:'var(--font-title)', fontSize:7, letterSpacing:1, color:'var(--dim)' }}>// TUS MONEDAS</div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <CoinIcon size={26} />
          <span style={{ fontFamily:'var(--font-hud)', fontSize:30, color:'var(--yellow)', textShadow:'var(--glow-yellow)' }}>
            {coins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="shop-tabs" style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key}
            className={`btn ${tab===t.key ? 'btn-yellow' : ''}`}
            style={{ fontSize:5, padding:'8px 12px', opacity: tab===t.key ? 1 : 0.6 }}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="skill-grid">
          {Array.from({length:6}).map((_,i)=>(<div key={i} className="skeleton skeleton-card" style={{ animationDelay:`${i*0.1}s` }} />))}
        </div>
      ) : (
        <div className="shop-grid">
          {shown.map(item => {
            const m = RARITY_META[item.rarity] || RARITY_META.common
            const affordable = coins >= item.price
            return (
              <div key={item.id} className="shop-card" style={{ borderColor: item.equipped ? 'var(--green)' : `${m.color}55` }}>
                <div className="shop-card-preview" style={{ boxShadow: item.rarity==='legendary' ? m.glow : 'none' }}>
                  <CosmeticPreview item={item} size={44} />
                </div>
                <div className="shop-card-name">{item.name}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:2 }}>
                  <RarityTag rarity={item.rarity} />
                  <span style={{ fontFamily:'var(--font-title)', fontSize:5, color:'var(--dim)' }}>{SLOT_LABELS[item.type]}</span>
                </div>

                <div style={{ marginTop:10 }}>
                  {item.owned ? (
                    item.equipped ? (
                      <button className="btn" style={{ width:'100%', fontSize:5, color:'var(--green)', borderColor:'var(--green)' }} disabled>✓ EQUIPADO</button>
                    ) : (
                      <button className="btn" style={{ width:'100%', fontSize:5 }} disabled={busy===item.id} onClick={() => equip(item)}>EQUIPAR</button>
                    )
                  ) : (
                    <button className={`btn ${affordable ? 'btn-yellow' : ''}`} style={{ width:'100%', fontSize:5, opacity: affordable ? 1 : 0.5 }}
                      disabled={!affordable || busy===item.id} onClick={() => buy(item)}>
                      {affordable ? <>🪙 {item.price.toLocaleString()}</> : 'SIN MONEDAS'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
