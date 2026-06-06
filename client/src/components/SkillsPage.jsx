import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { RANK_NAMES, RANK_CLASS, CAT_CLASS, CAT_LABELS, skillLevelFromXP, SKILL_XP_THR } from '../lib/rpg.js'
import { SkillModal, DeleteConfirm } from './Modals.jsx'
import { api } from '../lib/api.js'

function SkillCard({ skill, taskCounts, onEdit, onDelete }) {
  const lv = skillLevelFromXP(skill.xp)
  const nextXP = SKILL_XP_THR[lv] ?? skill.xp + 100
  const prevXP = SKILL_XP_THR[lv-1] ?? 0
  const pct = lv >= 10 ? 100 : Math.max(0,Math.round(((skill.xp-prevXP)/(nextXP-prevXP))*100))
  const rankName = RANK_NAMES[lv]||'GRANDMASTER'
  const rankCls  = RANK_CLASS[lv]||'rank-grandmaster'
  const catCls   = CAT_CLASS[skill.category]||'cat-tech'
  const catLabel = CAT_LABELS[skill.category]||skill.category
  const hasTasks = taskCounts && (taskCounts.active > 0 || taskCounts.completed > 0)
  return (
    <div className="skill-card">
      <div className="pc pc-tl"/><div className="pc pc-tr"/>
      <div className="pc pc-bl"/><div className="pc pc-br"/>
      <div className="skill-card-header">
        <div style={{flex:1}}>
          <div className="skill-name">{skill.name}</div>
          <span className={`skill-cat-badge ${catCls}`}>{catLabel}</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
          <div className="card-actions">
            <button className="action-btn" onClick={onEdit}>✎</button>
            <button className="action-btn del" onClick={onDelete}>✕</button>
          </div>
          <div className="skill-level-num">{lv}</div>
        </div>
      </div>
      <div style={{marginBottom:8,position:'relative',zIndex:1}}>
        <span className={`skill-rank ${rankCls}`}>{rankName}</span>
      </div>
      <div className="skill-xp-section">
        <div className="skill-xp-label">
          <span>SKILL XP</span>
          <span><span className="xp-num">{skill.xp.toLocaleString()}</span> / {lv>=10?'MAX':nextXP.toLocaleString()}</span>
        </div>
        <div className="skill-xp-track">
          <div className="skill-xp-fill" style={{width:`${pct}%`}}/>
        </div>
      </div>
      <div className="skill-meta">
        {skill.resources?.length>0 && (
          <div className="skill-meta-item">
            <span style={{color:'var(--cyan)'}}>📖</span>
            <span>{skill.resources.length} RESOURCE{skill.resources.length!==1?'S':''}</span>
          </div>
        )}
        {skill.notes && (
          <div className="skill-meta-item" style={{fontFamily:'var(--font-body)',fontSize:11,color:'var(--dim)',lineHeight:1.4,width:'100%',borderTop:'1px solid var(--border2)',paddingTop:6,marginTop:2}}>
            {skill.notes}
          </div>
        )}
      </div>
      {hasTasks && (
        <div className="skill-task-badge">
          <div className="task-badge-item"><span style={{color:'var(--cyan)'}}>⚡</span><span style={{color:'var(--cyan)'}}>{taskCounts.active} ACTIVE</span></div>
          <div className="task-badge-item" style={{marginLeft:8}}><span style={{color:'var(--green)'}}>✓</span><span style={{color:'var(--green)'}}>{taskCounts.completed} DONE</span></div>
        </div>
      )}
    </div>
  )
}

export default function SkillsPage({ skills, tasks, onSkillsChange }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editSkill, setEditSkill] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterCat, setFilterCat] = useState(null)

  const taskCountsBySkill = {}
  for (const t of tasks) {
    if (!t.relatedSkillId) continue
    if (!taskCountsBySkill[t.relatedSkillId]) taskCountsBySkill[t.relatedSkillId] = {active:0,completed:0}
    if (t.status==='completed') taskCountsBySkill[t.relatedSkillId].completed++
    else taskCountsBySkill[t.relatedSkillId].active++
  }

  const cats = [...new Set(skills.map(s=>s.category))]
  const filtered = filterCat ? skills.filter(s=>s.category===filterCat) : skills

  const handleSave = async (data, id) => {
    try {
      const saved = id ? await api.skills.update(id, data) : await api.skills.create(data)
      if (id) { onSkillsChange(s=>s.map(x=>x.id===id?saved:x)); toast('✓ SKILL UPDATED',{icon:'⚔️',className:'rpg-toast'}) }
      else { onSkillsChange(s=>[saved,...s]); toast('⭐ SKILL UNLOCKED',{className:'rpg-toast'}) }
      setModalOpen(false); setEditSkill(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  const handleDelete = async (id) => {
    try {
      await api.skills.delete(id)
      onSkillsChange(s=>s.filter(x=>x.id!==id))
      toast('SKILL REMOVED',{className:'rpg-toast'})
      setDeleteTarget(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  return (
    <div>
      <div className="filter-bar">
        <button className={`filter-pill ${!filterCat?'active':''}`} onClick={()=>setFilterCat(null)}>ALL</button>
        {cats.map(c=>(
          <button key={c} className={`filter-pill ${filterCat===c?'active':''}`} onClick={()=>setFilterCat(c)}>{c.toUpperCase()}</button>
        ))}
        <button className="btn btn-yellow btn-sm" style={{marginLeft:'auto'}} onClick={()=>{setEditSkill(null);setModalOpen(true)}}>+ UNLOCK</button>
      </div>
      {filtered.length===0 ? (
        <div className="empty-state">
          <div className="empty-blink">NO SKILLS. PRESS + UNLOCK TO BEGIN.</div>
        </div>
      ) : (
        <div className="skill-grid">
          {filtered.map(skill=>(
            <SkillCard key={skill.id} skill={skill} taskCounts={taskCountsBySkill[skill.id]}
              onEdit={()=>{setEditSkill(skill);setModalOpen(true)}}
              onDelete={()=>setDeleteTarget(skill)}
            />
          ))}
        </div>
      )}
      {modalOpen && <SkillModal skill={editSkill} onSave={handleSave} onClose={()=>{setModalOpen(false);setEditSkill(null)}}/>}
      {deleteTarget && (
        <div className="modal-overlay" onClick={()=>setDeleteTarget(null)}>
          <div onClick={e=>e.stopPropagation()}>
            <DeleteConfirm name={deleteTarget.name} onConfirm={()=>handleDelete(deleteTarget.id)} onCancel={()=>setDeleteTarget(null)}/>
          </div>
        </div>
      )}
    </div>
  )
}
