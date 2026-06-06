import { useEffect } from 'react'

export default function LevelUpFlash({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="level-up-flash">
      <div className="level-up-text">
        ★ LEVEL UP ★<br />
        <span style={{ fontSize: 10 }}>{message}</span>
      </div>
    </div>
  )
}
