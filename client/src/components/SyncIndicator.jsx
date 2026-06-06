import { useState, useEffect } from 'react'
import { onSyncChange } from '../lib/api.js'

export default function SyncIndicator() {
  const [status, setStatus] = useState('saved')

  useEffect(() => {
    return onSyncChange(setStatus)
  }, [])

  const labels = { saved: '● SAVED', syncing: '◎ SYNCING...', error: '⚠ SYNC ERROR' }
  return (
    <div className={`sync-indicator ${status}`}>
      <div className="sync-dot" />
      {labels[status] || labels.saved}
    </div>
  )
}
