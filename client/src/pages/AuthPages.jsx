import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { ApiError } from '../lib/api.js'

export function LoginPage({ onSwitch }) {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-game-logo">
          <span className="game-title">THE LIFE OF ANTON</span>
          <span className="game-tagline">EVERY DAY IS A QUEST</span>
        </div>
        <div className="auth-form-title">▶ PLAYER LOGIN</div>
        {error && <div className="auth-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">EMAIL</label>
            <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="player@example.com" required autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">PASSWORD</label>
            <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-yellow" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? '◎ LOADING...' : '▶ START GAME'}
          </button>
        </form>
        <div className="auth-footer">
          NEW PLAYER?
          <button onClick={onSwitch}>CREATE ACCOUNT</button>
        </div>
      </div>
    </div>
  )
}

export function SignupPage({ onSwitch }) {
  const { signup } = useAuth()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signup(email, password, name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-game-logo">
          <span className="game-title">THE LIFE OF ANTON</span>
          <span className="game-tagline">BEGIN YOUR JOURNEY</span>
        </div>
        <div className="auth-form-title">▶ CREATE PLAYER</div>
        {error && <div className="auth-error">⚠ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">PLAYER NAME</label>
            <input className="form-input" value={name} onChange={e=>setName(e.target.value)}
              placeholder="Your name" required autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">EMAIL</label>
            <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="player@example.com" required />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">PASSWORD</label>
            <input className="form-input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="Min 6 characters" required />
          </div>
          <button type="submit" className="btn btn-yellow" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
            {loading ? '◎ CREATING...' : '▶ CREATE ACCOUNT'}
          </button>
        </form>
        <div className="auth-footer">
          ALREADY REGISTERED?
          <button onClick={onSwitch}>LOG IN</button>
        </div>
      </div>
    </div>
  )
}
