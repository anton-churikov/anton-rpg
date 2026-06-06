export default function XPBar({ current, max, label, color = 'cyan', height = 14, showPct = true, showNums = true }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const fills = {
    cyan: 'linear-gradient(90deg, var(--blue) 0%, var(--cyan) 100%)',
    green: 'linear-gradient(90deg, var(--blue) 0%, var(--green) 100%)',
    yellow: 'linear-gradient(90deg, var(--orange) 0%, var(--yellow) 100%)',
  }

  return (
    <div className="xp-bar-wrap">
      {(label || showNums) && (
        <div className="xp-bar-label">
          {label && <span>{label}</span>}
          {showNums && (
            <span>
              <span className="xp-highlight">{current.toLocaleString()}</span>
              <span style={{ color: 'var(--dim)' }}> / {max.toLocaleString()} XP</span>
            </span>
          )}
        </div>
      )}
      <div className="xp-track" style={{ height }}>
        <div className="xp-fill" style={{ width: `${pct}%`, background: fills[color] || fills.cyan }} />
      </div>
      {showPct && (
        <div className="xp-bar-pct">{pct}%</div>
      )}
    </div>
  )
}
