import { useState, useEffect } from 'react'

function useEsc(fn) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') fn() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [fn])
}

// ── SKILL MODAL ───────────────────────────────────────────────────────────────
export function SkillModal({ skill, onSave, onClose }) {
  const isEdit = !!skill
  const [form, setForm] = useState({
    name: skill?.name || '', category: skill?.category || 'Tech',
    notes: skill?.notes || '', resources: skill?.resources?.length ? [...skill.resources,''] : [''],
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  useEsc(onClose)
  const set = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(e=>({...e,[f]:undefined})) }
  const setRes = (i,v) => { const r=[...form.resources]; r[i]=v; setForm(p=>({...p,resources:r})) }

  const submit = async () => {
    if (!form.name.trim()) { setErrors({name:'Name required'}); return }
    setSaving(true)
    await onSave({...form,name:form.name.trim(),resources:form.resources.filter(r=>r.trim())}, skill?.id)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit?'▶ EDIT SKILL':'▶ UNLOCK SKILL'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">SKILL NAME <span className="req">*</span></label>
            <input className={`form-input ${errors.name?'err':''}`} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. React Development" autoFocus />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">CATEGORY</label>
            <select className="form-select" value={form.category} onChange={e=>set('category',e.target.value)}>
              <option value="Tech">TECH</option><option value="Soft">SOFT</option>
              <option value="Domain">DOMAIN</option><option value="Fitness">FITNESS</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">NOTES</label>
            <textarea className="form-textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Strategy, goals..." />
          </div>
          <div className="form-group">
            <label className="form-label">RESOURCES</label>
            <div className="resources-list">
              {form.resources.map((r,i)=>(
                <div key={i} className="resource-row">
                  <input className="form-input" value={r} onChange={e=>setRes(i,e.target.value)} placeholder="https://..." />
                  {form.resources.length>1 && <button className="resource-remove" onClick={()=>{const rr=form.resources.filter((_,idx)=>idx!==i); setForm(p=>({...p,resources:rr.length?rr:['']}))}}>✕</button>}
                </div>
              ))}
              <button className="add-resource" onClick={()=>setForm(p=>({...p,resources:[...p.resources,'']}))}>+ ADD RESOURCE</button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-yellow" onClick={submit} disabled={saving}>{saving?'...':isEdit?'▶ SAVE':'▶ UNLOCK'}</button>
        </div>
      </div>
    </div>
  )
}

// ── QUEST MODAL ───────────────────────────────────────────────────────────────
export function QuestModal({ quest, skills, onSave, onClose }) {
  const isEdit = !!quest
  const xpMap = { main:200, side:100, daily:50, boss:500 }
  const [form, setForm] = useState({
    title: quest?.title||'', description: quest?.description||'',
    type: quest?.type||'main', relatedSkillId: quest?.relatedSkillId||'',
    xpReward: quest?.xpReward||200, deadline: quest?.deadline||'',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  useEsc(onClose)
  const set = (f,v) => {
    setForm(p => { const n={...p,[f]:v}; if(f==='type') n.xpReward=xpMap[v]||200; return n })
    setErrors(e=>({...e,[f]:undefined}))
  }
  const submit = async () => {
    if (!form.title.trim()) { setErrors({title:'Title required'}); return }
    setSaving(true)
    await onSave({...form,title:form.title.trim(),relatedSkillId:form.relatedSkillId||null,deadline:form.deadline||null}, quest?.id)
    setSaving(false)
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit?'▶ EDIT QUEST':'▶ POST QUEST'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">TITLE <span className="req">*</span></label>
            <input className={`form-input ${errors.title?'err':''}`} value={form.title} onChange={e=>set('title',e.target.value)} autoFocus />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} style={{minHeight:56}} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">TYPE</label>
              <select className="form-select" value={form.type} onChange={e=>set('type',e.target.value)}>
                <option value="main">MAIN QUEST</option><option value="side">SIDE QUEST</option>
                <option value="daily">DAILY QUEST</option><option value="boss">BOSS QUEST</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">XP REWARD</label>
              <input type="number" className="form-input" value={form.xpReward} onChange={e=>set('xpReward',Number(e.target.value))} min={1} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">LINKED SKILL</label>
              <select className="form-select" value={form.relatedSkillId} onChange={e=>set('relatedSkillId',e.target.value)}>
                <option value="">— NONE —</option>
                {skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">DEADLINE</label>
              <input type="date" className="form-input" value={form.deadline} onChange={e=>set('deadline',e.target.value)} style={{colorScheme:'dark'}} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-yellow" onClick={submit} disabled={saving}>{saving?'...':isEdit?'▶ SAVE':'▶ POST'}</button>
        </div>
      </div>
    </div>
  )
}

// ── TASK MODAL ────────────────────────────────────────────────────────────────
export function TaskModal({ task, skills, onSave, onClose }) {
  const isEdit = !!task
  const xpMap = { easy:25, normal:50, hard:100, epic:250 }
  const [form, setForm] = useState({
    title: task?.title||'', description: task?.description||'',
    difficulty: task?.difficulty||'normal', status: task?.status||'todo',
    relatedSkillId: task?.relatedSkillId||'', dueDate: task?.dueDate||'',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  useEsc(onClose)
  const set = (f,v) => { setForm(p=>({...p,[f]:v})); setErrors(e=>({...e,[f]:undefined})) }
  const submit = async () => {
    if (!form.title.trim()) { setErrors({title:'Title required'}); return }
    setSaving(true)
    await onSave({...form,title:form.title.trim(),relatedSkillId:form.relatedSkillId||null,dueDate:form.dueDate||null}, task?.id)
    setSaving(false)
  }
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{isEdit?'▶ EDIT MISSION':'▶ NEW MISSION'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">TITLE <span className="req">*</span></label>
            <input className={`form-input ${errors.title?'err':''}`} value={form.title} onChange={e=>set('title',e.target.value)} autoFocus />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea className="form-textarea" value={form.description} onChange={e=>set('description',e.target.value)} style={{minHeight:50}} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">DIFFICULTY</label>
              <select className="form-select" value={form.difficulty} onChange={e=>set('difficulty',e.target.value)}>
                <option value="easy">EASY (+25 XP)</option><option value="normal">NORMAL (+50 XP)</option>
                <option value="hard">HARD (+100 XP)</option><option value="epic">EPIC (+250 XP)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">STATUS</label>
              <select className="form-select" value={form.status} onChange={e=>set('status',e.target.value)}>
                <option value="todo">AVAILABLE</option><option value="in_progress">ACTIVE</option>
                <option value="completed">COMPLETED</option><option value="failed">FAILED</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">LINKED SKILL</label>
              <select className="form-select" value={form.relatedSkillId} onChange={e=>set('relatedSkillId',e.target.value)}>
                <option value="">— NONE —</option>
                {skills.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">DUE DATE</label>
              <input type="date" className="form-input" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)} style={{colorScheme:'dark'}} />
            </div>
          </div>
          <div style={{background:'var(--bg3)',border:'1px solid var(--border2)',padding:'8px 12px',fontFamily:'var(--font-hud)',fontSize:15,color:'var(--green)'}}>
            XP REWARD: +{xpMap[form.difficulty]||50} XP
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-yellow" onClick={submit} disabled={saving}>{saving?'...':isEdit?'▶ SAVE':'▶ ACCEPT'}</button>
        </div>
      </div>
    </div>
  )
}

// ── DELETE CONFIRM ────────────────────────────────────────────────────────────
export function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div className="delete-confirm">
      <div className="delete-confirm-title">⚠ CONFIRM DELETE</div>
      <div className="delete-confirm-text">
        Delete <span style={{color:'var(--white)',fontFamily:'var(--font-hud)'}}>{name}</span>?
        <br/><br/><span style={{color:'var(--red)',opacity:0.8}}>THIS CANNOT BE UNDONE.</span>
      </div>
      <div className="delete-confirm-actions">
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>CANCEL</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm}>✕ DELETE</button>
      </div>
    </div>
  )
}

export default SkillModal
