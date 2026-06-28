import { useState, useEffect, useCallback, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { LoginPage, SignupPage } from './pages/AuthPages.jsx'
import PlayerPage          from './components/PlayerPage.jsx'
import SkillsPage          from './components/SkillsPage.jsx'
import RoadmapPage         from './components/RoadmapPage.jsx'
import TasksPage           from './components/TasksPage.jsx'
import AchievementsPage    from './components/AchievementsPage.jsx'
import CalendarPage        from './components/CalendarPage.jsx'
import TimeManagementPage  from './components/TimeManagementPage.jsx'
import ShopPage            from './components/ShopPage.jsx'
import VaultPage           from './components/VaultPage.jsx'
import LevelUpFlash        from './components/LevelUpFlash.jsx'
import XPBar               from './components/XPBar.jsx'
import SyncIndicator       from './components/SyncIndicator.jsx'
import { api }             from './lib/api.js'
import {
  playerLevelFromXP, playerXPForLevel, playerXPForNextLevel,
  PLAYER_TITLES, skillLevelFromXP,
} from './lib/rpg.js'

function XPPopup({ amount, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 1800); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="xp-gain-popup" style={{ top:'18%', left:'50%', transform:'translateX(-50%)' }}>
      ⬡ +{amount} XP
    </div>
  )
}

const NAV = [
  { key:'player',      label:'PLAYER',        icon:'⚔️' },
  { key:'roadmap',     label:'ROADMAP',        icon:'🗺️' },
  { key:'time',        label:'TIEMPO',         icon:'⏱️' },
  { key:'calendar',    label:'CALENDARIO',     icon:'📅' },
  { key:'skills',      label:'HABILIDADES',    icon:'⭐' },
  { key:'tasks',       label:'MISIONES',       icon:'⚡' },
  { key:'achievements',label:'LOGROS',         icon:'🏆' },
  { key:'shop',        label:'TIENDA',         icon:'🛒' },
  { key:'vault',       label:'BÓVEDA',         icon:'🎒' },
]

const FUTURE_NAV = [
  { label:'BATALLAS',   icon:'🐉' },
]

const PAGE_META = {
  player:       { eyebrow:'▶ PLAYER_DATA.SAV', title:'THE LIFE OF ANTON',     subtitle:'EVERY DAY IS A QUEST. EVERY SKILL IS A LEVEL.' },
  roadmap:      { eyebrow:'▶ ROADMAP.DAT',     title:'ROADMAP',               subtitle:'TUS OBJETIVOS. TU CAMINO. TU HISTORIA.' },
  time:         { eyebrow:'▶ TIME.DAT',        title:'GESTIÓN DEL TIEMPO',    subtitle:'24 HORAS. ÚSALAS CON INTENCIÓN.' },
  calendar:     { eyebrow:'▶ CALENDAR.DAT',    title:'CALENDARIO',            subtitle:'ORGANIZA TU TIEMPO. DOMINA TU DÍA.' },
  skills:       { eyebrow:'▶ SKILLS.DAT',      title:'HABILIDADES',           subtitle:'ENTRENA DURO. SUBE DE NIVEL. CONQUISTA.' },
  tasks:        { eyebrow:'▶ MISSIONS.DAT',    title:'REGISTRO DE MISIONES',  subtitle:'COMPLETA MISIONES. RECOGE XP. SUBE DE NIVEL.' },
  achievements: { eyebrow:'▶ RECORDS.SAV',     title:'LOGROS',                subtitle:'DESBLOQUEA INSIGNIAS. DEMUESTRA TU VALÍA.' },
  shop:         { eyebrow:'▶ SHOP.EXE',        title:'TIENDA',                subtitle:'GASTA TUS MONEDAS. PERSONALIZA TU LEYENDA.' },
  vault:        { eyebrow:'▶ VAULT.SAV',       title:'BÓVEDA',                subtitle:'TU COLECCIÓN. EQUIPA TU ESTILO.' },
}

function GameShell() {
  const { user, profile, setProfile, logout, refreshProfile } = useAuth()
  const [route, setRoute]     = useState('player')
  const [skills, setSkills]   = useState([])
  const [quests, setQuests]   = useState([])
  const [tasks, setTasks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [xpPopup, setXpPopup]     = useState(null)
  const [levelUpMsg, setLevelUpMsg] = useState(null)
  const addTaskRef = useRef(null)

  useEffect(() => {
    Promise.all([api.skills.list(), api.quests.list(), api.tasks.list()])
      .then(([s,q,t]) => { setSkills(s); setQuests(q); setTasks(t) })
      .catch(() => toast.error('Error al cargar datos', { className:'rpg-toast' }))
      .finally(() => setLoading(false))
  }, [])

  const handleXPGain = useCallback(async (amount) => {
    if (!amount) return
    setXpPopup({ amount, id: Date.now() })
    const oldLevel = playerLevelFromXP(profile?.totalXP ?? 0)
    try {
      const updated = await api.player.get()
      setProfile(updated)
      const newLevel = playerLevelFromXP(updated.totalXP)
      if (newLevel > oldLevel)
        setTimeout(() => setLevelUpMsg(`NIVEL ${newLevel} — ${PLAYER_TITLES[Math.min(newLevel, PLAYER_TITLES.length-1)]}`), 500)
    } catch {}
  }, [profile, setProfile])

  // Apply equipped theme: recolor the global accent. Reset when none equipped.
  useEffect(() => {
    const theme = profile?.equippedCosmetics?.theme?.data
    const root = document.documentElement
    if (theme?.accent) {
      root.style.setProperty('--yellow', theme.accent)
      if (theme.glow) root.style.setProperty('--glow-yellow', theme.glow)
    } else {
      root.style.removeProperty('--yellow')
      root.style.removeProperty('--glow-yellow')
    }
  }, [profile?.equippedCosmetics?.theme?.id])

  const navigate = (r) => { setRoute(r); setSidebarOpen(false) }

  const totalXP = profile?.totalXP ?? 0
  const level   = playerLevelFromXP(totalXP)
  const prevXP  = playerXPForLevel(level)
  const nextXP  = playerXPForNextLevel(level)
  const xpInLv  = totalXP - prevXP
  const xpForLv = Math.max(1, nextXP - prevXP)

  const activeMissions  = tasks.filter(t => t.status !== 'completed').length
  const activeQuests    = quests.filter(q => q.status !== 'completed').length
  const unlockedAchs    = profile?.unlockedAchievements?.length ?? 0
  const page            = PAGE_META[route]

  return (
    <div className="app">
      <Toaster position="bottom-right" toastOptions={{ duration:2500 }} />
      {xpPopup && <XPPopup key={xpPopup.id} amount={xpPopup.amount} onDone={() => setXpPopup(null)} />}
      {levelUpMsg && <LevelUpFlash message={levelUpMsg} onDone={() => setLevelUpMsg(null)} />}
      {sidebarOpen && <div style={{ position:'fixed',inset:0,zIndex:40,background:'rgba(0,0,6,0.7)' }} onClick={() => setSidebarOpen(false)} />}

      {/* ══ SIDEBAR ════════════════════════════════════════════ */}
      <aside className={`sidebar ${sidebarOpen?'open':''}`}>
        <div className="sidebar-logo">
          <div className="logo-game-tag">▶ SEGA RPG</div>
          <div className="logo-title">THE LIFE<br/>OF ANTON</div>
          <div className="logo-subtitle">EVERY DAY IS A QUEST</div>
        </div>

        {profile && (
          <div className="sidebar-player-hud">
            <div className="player-hud-name">⚔️ {profile.displayName || user?.name?.toUpperCase()}</div>
            <div className="player-hud-level">
              <span className="player-hud-lv">LV.{level}</span>
              <span className="player-hud-xp">{totalXP.toLocaleString()} XP</span>
            </div>
            <div className="mini-xp-bar">
              <div className="mini-xp-fill" style={{ width:`${Math.round((xpInLv/xpForLv)*100)}%` }} />
            </div>
            <div className="player-hud-coins" onClick={() => navigate('shop')} title="Ir a la tienda">
              🪙 <span>{(profile.coins ?? 0).toLocaleString()}</span>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          <div className="nav-section-label">// MENÚ</div>
          {NAV.map(n => (
            <div key={n.key} className={`nav-item ${route===n.key?'active':''}`} onClick={() => navigate(n.key)}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.key==='tasks'  && activeMissions>0 && <span className="nav-badge">{activeMissions}</span>}
              {n.key==='roadmap'&& activeQuests>0   && <span className="nav-badge" style={{color:'var(--yellow)',borderColor:'rgba(255,221,0,0.4)',background:'rgba(255,221,0,0.1)'}}>{activeQuests}</span>}
              {n.key==='achievements'&& unlockedAchs>0 && <span className="nav-badge" style={{color:'var(--yellow)',borderColor:'rgba(255,221,0,0.4)',background:'rgba(255,221,0,0.1)'}}>{unlockedAchs}</span>}
            </div>
          ))}
          <div className="nav-section-label" style={{ marginTop:10 }}>// PRÓXIMAMENTE</div>
          {FUTURE_NAV.map(n => (
            <div key={n.label} className="nav-item-locked">
              <span className="nav-icon" style={{ fontSize:12 }}>{n.icon}</span>
              {n.label}
              <span className="lock-tag">PRONTO</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <SyncIndicator />
          <button className="theme-toggle-btn" onClick={async () => await logout()}>
            <span>⏻ CERRAR SESIÓN</span>
            <span style={{ fontFamily:'var(--font-hud)',fontSize:11,color:'var(--dim)' }}>{user?.email?.split('@')[0]}</span>
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══════════════════════════════════════════════════ */}
      <main className="main">
        <header className="page-header">
          <div className="page-header-top">
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
              <div className="page-header-title-block">
                <div className="page-eyebrow">{page?.eyebrow}</div>
                <div className="page-title">{page?.title}</div>
                <div className="page-subtitle">{page?.subtitle}</div>
              </div>
            </div>
            <div className="page-actions">
              {!loading && !['player','achievements','calendar','time','roadmap','shop','vault'].includes(route) && (
                <div className="kpi-row" style={{ marginBottom:0 }}>
                  {route==='skills' && (<>
                    <div className="kpi-block"><div className="kpi-val c-yellow">{skills.length}</div><div className="kpi-label">TOTAL</div></div>
                    <div className="kpi-block"><div className="kpi-val c-cyan">{skills.length>0?Math.max(...skills.map(s=>skillLevelFromXP(s.xp))):0}</div><div className="kpi-label">MAX LV</div></div>
                  </>)}
                  {route==='tasks' && (<>
                    <div className="kpi-block"><div className="kpi-val c-cyan">{activeMissions}</div><div className="kpi-label">ACTIVAS</div></div>
                    <div className="kpi-block"><div className="kpi-val c-green">{tasks.filter(t=>t.status==='completed').length}</div><div className="kpi-label">HECHAS</div></div>
                    <div className="kpi-block"><div className="kpi-val c-yellow">{tasks.filter(t=>t.status!=='completed').reduce((s,t)=>s+t.xpReward,0)}</div><div className="kpi-label">XP DISP.</div></div>
                  </>)}
                </div>
              )}
              {route==='roadmap' && <button className="btn btn-yellow" onClick={() => document.dispatchEvent(new CustomEvent('open-quest-modal'))}>+ OBJETIVO</button>}
              {route==='tasks'   && <button className="btn btn-yellow" onClick={() => addTaskRef.current?.()}>+ MISIÓN</button>}
              {route==='skills'  && <button className="btn btn-yellow" onClick={() => document.dispatchEvent(new CustomEvent('open-skill-modal'))}>+ HABILIDAD</button>}
              {route==='time'    && <button className="btn btn-yellow" onClick={() => document.dispatchEvent(new CustomEvent('open-timeblock-modal'))}>+ BLOQUE</button>}
            </div>
          </div>
          {route==='player' && profile && (
            <div style={{ marginBottom:14 }}>
              <XPBar current={xpInLv} max={xpForLv} label={`NIVEL ${level}`} color="cyan" height={18} />
            </div>
          )}
          <div style={{ height:14 }} />
        </header>

        <div className="content" style={{ display:'flex', flexDirection:'column' }}>
          {loading ? (
            <div className="skill-grid">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="skeleton skeleton-card" style={{ animationDelay:`${i*0.1}s` }} />
              ))}
            </div>
          ) : (
            <>
              {route==='player'       && <PlayerPage        player={profile} skills={skills} tasks={tasks} quests={quests} />}
              {route==='roadmap'      && <RoadmapPage       quests={quests} skills={skills} onQuestsChange={setQuests} onXPGain={handleXPGain} />}
              {route==='time'         && <TimeManagementPage profile={profile} onProfileChange={setProfile} />}
              {route==='calendar'     && <CalendarPage      skills={skills} quests={quests} profile={profile} />}
              {route==='skills'       && <SkillsPage        skills={skills} tasks={tasks} onSkillsChange={setSkills} />}
              {route==='tasks'        && <TasksPage         tasks={tasks} skills={skills} onTasksChange={setTasks} onXPGain={handleXPGain} addTaskRef={addTaskRef} />}
              {route==='achievements' && <AchievementsPage  player={profile} skills={skills} tasks={tasks} quests={quests} />}
              {route==='shop'         && <ShopPage          onProfileChange={refreshProfile} />}
              {route==='vault'        && <VaultPage         onProfileChange={refreshProfile} />}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function AuthGate() {
  const { user, loading } = useAuth()
  const [showSignup, setShowSignup] = useState(false)
  if (loading) return (
    <div className="auth-page">
      <div style={{ fontFamily:'var(--font-title)', fontSize:10, color:'var(--yellow)', textShadow:'var(--glow-yellow)', animation:'blink 1s step-end infinite' }}>
        CARGANDO...
      </div>
    </div>
  )
  if (!user) return showSignup
    ? <SignupPage onSwitch={() => setShowSignup(false)} />
    : <LoginPage  onSwitch={() => setShowSignup(true)} />
  return <GameShell />
}

export default function App() {
  return <AuthProvider><AuthGate /></AuthProvider>
}
