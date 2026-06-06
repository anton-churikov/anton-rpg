import { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { DIFF_LABELS, CAT_CLASS, fmtDeadline } from '../lib/rpg.js'
import { TaskModal, DeleteConfirm } from './Modals.jsx'
import { api } from '../lib/api.js'

const COLS = [
  {key:'todo',label:'AVAILABLE',cls:'col-todo'},
  {key:'in_progress',label:'ACTIVE',cls:'col-active'},
  {key:'completed',label:'COMPLETED',cls:'col-done'},
  {key:'failed',label:'FAILED',cls:'col-failed'},
]
const DIFF_ORD = {epic:0,hard:1,normal:2,easy:3}

function MissionCard({ task, onEdit, onDelete, onToggle }) {
  const due = fmtDeadline(task.dueDate)
  const isDone = task.status === 'completed'
  return (
    <div className={`mission-card d-${task.difficulty} ${isDone?'done':''}`}>
      <div className="mission-card-header">
        <button className={`mission-check ${isDone?'done':''}`} onClick={()=>onToggle(task)}/>
        <div className="mission-title">{task.title}</div>
        <div className="mission-actions">
          <button className="action-btn" onClick={onEdit}>✎</button>
          <button className="action-btn del" onClick={onDelete}>✕</button>
        </div>
      </div>
      {task.description && <div style={{fontFamily:'var(--font-body)',fontSize:11,color:'var(--dim)',lineHeight:1.4,marginBottom:6}}>{task.description}</div>}
      <div className="mission-badges">
        <span className={`diff-badge diff-${task.difficulty}`}>{DIFF_LABELS[task.difficulty]}</span>
        <span className="xp-badge">+{task.xpReward} XP</span>
        {task.skillName && <span className={`skill-link-badge ${CAT_CLASS[task.skillCategory]||'cat-tech'}`} style={{fontSize:10,padding:'0 5px'}}>{task.skillName}</span>}
      </div>
      <div className="mission-meta">
        {due && <span className={due.cls} style={{fontFamily:'var(--font-hud)',fontSize:12}}>◷ {due.label}{due.suffix}</span>}
        {isDone && task.completedAt && <span style={{color:'var(--green)',fontFamily:'var(--font-hud)',fontSize:12}}>✓ {new Date(task.completedAt).toLocaleDateString()}</span>}
      </div>
    </div>
  )
}

export default function TasksPage({ tasks, skills, onTasksChange, onXPGain, addTaskRef }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterDiff, setFilterDiff] = useState(null)
  const [viewMode, setViewMode] = useState('kanban')

  useEffect(() => {
    if (addTaskRef) addTaskRef.current = () => { setEditTask(null); setModalOpen(true) }
    return () => { if (addTaskRef) addTaskRef.current = null }
  }, [addTaskRef])

  const filtered = filterDiff ? tasks.filter(t=>t.difficulty===filterDiff) : tasks
  const byStatus = useMemo(() => {
    const m = {}
    for (const col of COLS) m[col.key] = filtered.filter(t=>t.status===col.key).sort((a,b)=>DIFF_ORD[a.difficulty]-DIFF_ORD[b.difficulty])
    return m
  }, [filtered])
  const stats = { todo:tasks.filter(t=>t.status==='todo').length, in_progress:tasks.filter(t=>t.status==='in_progress').length, completed:tasks.filter(t=>t.status==='completed').length, failed:tasks.filter(t=>t.status==='failed').length }

  const handleSave = async (data, id) => {
    try {
      const saved = id ? await api.tasks.update(id,data) : await api.tasks.create(data)
      if (id) { onTasksChange(ts=>ts.map(t=>t.id===id?saved:t)); toast('⚔️ MISSION UPDATED',{className:'rpg-toast'}) }
      else { onTasksChange(ts=>[saved,...ts]); toast('📋 MISSION ADDED',{className:'rpg-toast'}) }
      setModalOpen(false); setEditTask(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  const handleToggle = async (task) => {
    const newStatus = task.status==='completed' ? 'todo' : 'completed'
    try {
      const updated = await api.tasks.update(task.id, { status:newStatus })
      onTasksChange(ts=>ts.map(t=>t.id===task.id?updated:t))
      if (newStatus==='completed') {
        onXPGain(updated.xpAwarded||task.xpReward, `MISSION: ${task.title}`)
        toast(`⚡ +${task.xpReward} XP EARNED`,{className:'rpg-toast'})
      } else toast('↩ MISSION REOPENED',{className:'rpg-toast'})
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  const handleDelete = async (id) => {
    try {
      await api.tasks.delete(id)
      onTasksChange(ts=>ts.filter(t=>t.id!==id))
      toast('MISSION ABANDONED',{className:'rpg-toast'})
      setDeleteTarget(null)
    } catch(e) { toast.error(e.message||'Error',{className:'rpg-toast'}) }
  }

  return (
    <div>
      <div className="task-stats-bar">
        <div className="task-stat"><div className="task-stat-val" style={{color:'var(--dim)'}}>{stats.todo}</div><div className="task-stat-label">AVAILABLE</div></div>
        <div className="task-stat"><div className="task-stat-val" style={{color:'var(--cyan)',textShadow:'var(--glow-cyan)'}}>{stats.in_progress}</div><div className="task-stat-label">ACTIVE</div></div>
        <div className="task-stat"><div className="task-stat-val" style={{color:'var(--green)',textShadow:'var(--glow-green)'}}>{stats.completed}</div><div className="task-stat-label">COMPLETED</div></div>
        <div className="task-stat"><div className="task-stat-val" style={{color:'var(--red)',textShadow:'var(--glow-red)'}}>{stats.failed}</div><div className="task-stat-label">FAILED</div></div>
      </div>
      <div className="filter-bar">
        <span style={{fontFamily:'var(--font-title)',fontSize:6,color:'var(--dim)',letterSpacing:2}}>DIFF:</span>
        {['easy','normal','hard','epic'].map(d=>(
          <button key={d} className={`filter-pill ${filterDiff===d?'active':''}`} onClick={()=>setFilterDiff(p=>p===d?null:d)}>{d.toUpperCase()}</button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8}}>
          {filterDiff && <button className="btn btn-ghost btn-sm" onClick={()=>setFilterDiff(null)}>✕ CLEAR</button>}
          <div className="view-toggle">
            <button className={`view-btn ${viewMode==='kanban'?'active':''}`} onClick={()=>setViewMode('kanban')}>⬡ KANBAN</button>
            <button className={`view-btn ${viewMode==='list'?'active':''}`} onClick={()=>setViewMode('list')}>≡ LIST</button>
          </div>
        </div>
      </div>
      {filtered.length===0 ? (
        <div className="empty-state"><div className="empty-blink">NO MISSIONS. CREATE YOUR FIRST QUEST.</div></div>
      ) : viewMode==='kanban' ? (
        <div className="kanban">
          {COLS.map(col=>(
            <div key={col.key} className={`kanban-col ${col.cls}`}>
              <div className="kanban-col-header">
                <span className="kanban-col-title">{col.label}</span>
                <span className="kanban-col-count">{byStatus[col.key].length}</span>
              </div>
              <div className="kanban-cards">
                {byStatus[col.key].length===0 && <div style={{fontFamily:'var(--font-hud)',fontSize:12,color:'var(--dim2)',textAlign:'center',padding:'10px 0'}}>— EMPTY —</div>}
                {byStatus[col.key].map(task=>(
                  <MissionCard key={task.id} task={task}
                    onEdit={()=>{setEditTask(task);setModalOpen(true)}}
                    onDelete={()=>setDeleteTarget(task)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {COLS.map(col=>{
            const ct=byStatus[col.key]; if(!ct.length) return null
            return (<div key={col.key}>
              <div className="section-header" style={{marginBottom:8}}>
                <span className="section-title">{col.label}</span><span className="section-count">{ct.length}</span><div className="section-line"/>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {ct.map(task=>(
                  <MissionCard key={task.id} task={task}
                    onEdit={()=>{setEditTask(task);setModalOpen(true)}}
                    onDelete={()=>setDeleteTarget(task)}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </div>)
          })}
        </div>
      )}
      {modalOpen && <TaskModal task={editTask} skills={skills} onSave={handleSave} onClose={()=>{setModalOpen(false);setEditTask(null)}}/>}
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
