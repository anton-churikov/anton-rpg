import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { QUEST_LABELS, CAT_CLASS, fmtDeadline } from '../lib/rpg.js'
import { QuestModal, DeleteConfirm } from './Modals.jsx'
import { api } from '../lib/api.js'

const TYPE_ORDER = { boss:0, main:1, side:2, daily:3 }

function QuestCard({ quest, onEdit, onDelete, onComplete }) {
  const due = fmtDeadline(quest.deadline)
  const isDone = quest.status === 'completed'
  return (
    <div className={`quest-card ${quest.type}`} style={{opacity:isDone?0.6:1}}>
      <div className="cat-bar"/>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginTop:8}}>
        <span className={`quest-type-tag qt-${quest.type}`}>{QUEST_LABELS[quest.type]}</span>
        <div className="card-actions" style={{opacity:1}}>
          {!isDone && <button className="action-btn" onClick={onComplete} title="Complete">✓</button>}
          <button className="action-btn" onClick={onEdit}>✎</button>
          <button className="action-btn del" onClick={onDelete}>✕</button>
        </div>
      </div>
      <div className="quest-title" style={{textDecoration:isDone?'line-through':'none'}}>{quest.title}</div>
      {quest.description && <div style={{fontFamily:'var(--font-body)',fontSize:11,color:'var(--dim)',lineHeight:1.5,marginBottom:8}}>{quest.description}</div>}
      <div className="quest-xp-reward"><span className="quest-xp-icon">⬡</span>+{quest.xpReward} XP{quest.type==='boss'&&<span style={{color:'var(--red)',marginLeft:8,fontSize:13}}>BOSS</span>}</div>
      <div className="quest-meta">
        {quest.skillName && <span className={`skill-link-badge ${CAT_CLASS[quest.skillCategory]||'cat-tech'}`} style={{fontSize:11,padding:'1px 6px'}}>{quest.skillName}</span>}
        {due && <span className={due.cls} style={{fontFamily:'var(--font-hud)',fontSize:12}}>◷ {due.label}{due.suffix}</span>}
        {isDone && <span style={{color:'var(--green)',fontFamily:'var(--font-hud)',fontSize:12}}>✓ CLEARED</span>}
      </div>
    </div>
  )
}

export default function QuestsPage({ quests, skills, onQuestsChange, onXPGain }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editQuest, setEditQuest] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showDone, setShowDone] = useState(false)
  const [filterType, setFilterType] = useState(null)

  const active = quests.filter(q=>q.status!=='completed')
  const done   = quests.filter(q=>q.status==='completed')
  const displayed = (showDone?done:active)
    .filter(q=>!filterType||q.type===filterType)
    .sort((a,b)=>TYPE_ORDER[a.type]-TYPE_ORDER[b.type])

  const handleSave = async (data, id) => {
    try {
      const saved = id ? await api.quests.update(id, data) : await api.quests.create(data)
      if (id) { onQuestsChange(qs=>qs.map(q=>q.id===id?saved:q)); toast('⚔️ QUEST UPDATED',{className:'rpg-toast'}) }
      else { onQuestsChange(qs=>[saved,...qs]); toast('📜 QUEST POSTED',{className:'rpg-toast'}) }
      setModalOpen(false); setEditQuest(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  const handleComplete = async (quest) => {
    try {
      const updated = await api.quests.update(quest.id, { status:'completed' })
      onQuestsChange(qs=>qs.map(q=>q.id===quest.id?updated:q))
      onXPGain(updated.xpAwarded||quest.xpReward, `QUEST CLEARED: ${quest.title}`)
      if (quest.type==='boss') toast('🐉 BOSS DEFEATED!',{className:'rpg-toast',duration:4000})
      else toast(`⭐ QUEST COMPLETE! +${quest.xpReward} XP`,{className:'rpg-toast'})
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  const handleDelete = async (id) => {
    try {
      await api.quests.delete(id)
      onQuestsChange(qs=>qs.filter(q=>q.id!==id))
      toast('QUEST ABANDONED',{className:'rpg-toast'})
      setDeleteTarget(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  return (
    <div>
      <div className="filter-bar">
        <button className={`filter-pill ${!showDone?'active':''}`} onClick={()=>setShowDone(false)}>⚔️ ACTIVE ({active.length})</button>
        <button className={`filter-pill ${showDone?'active':''}`} onClick={()=>setShowDone(true)}>✓ CLEARED ({done.length})</button>
        <div className="filter-sep"/>
        {['boss','main','side','daily'].map(t=>(
          <button key={t} className={`filter-pill ${filterType===t?'active':''}`} onClick={()=>setFilterType(p=>p===t?null:t)}>{t.toUpperCase()}</button>
        ))}
        <button className="btn btn-yellow btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setEditQuest(null);setModalOpen(true)}}>+ POST QUEST</button>
      </div>
      {displayed.length===0 ? (
        <div className="empty-state"><div className="empty-blink">NO QUESTS. POST YOUR FIRST QUEST.</div></div>
      ) : (
        <div className="quest-grid">
          {displayed.map(q=>(
            <QuestCard key={q.id} quest={q}
              onEdit={()=>{setEditQuest(q);setModalOpen(true)}}
              onDelete={()=>setDeleteTarget(q)}
              onComplete={()=>handleComplete(q)}
            />
          ))}
        </div>
      )}
      {modalOpen && <QuestModal quest={editQuest} skills={skills} onSave={handleSave} onClose={()=>{setModalOpen(false);setEditQuest(null)}}/>}
      {deleteTarget && (
        <div className="modal-overlay" onClick={()=>setDeleteTarget(null)}>
          <div onClick={e=>e.stopPropagation()}>
            <DeleteConfirm name={deleteTarget.title} onConfirm={()=>handleDelete(deleteTarget.id)} onCancel={()=>setDeleteTarget(null)}/>
          </div>
        </div>
      )}
    </div>
  )
}
