import { useState } from 'react'
import { supabase } from '../supabase/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiSun, FiMoon, FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi'

export default function Auth() {
  const { signIn, signUp } = useAuth()
  const { dark, setDark } = useTheme()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const t = {
    bg: dark ? '#111110' : '#f5f5f3',
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    input: dark ? '#252523' : '#f9f9f7',
    inputBorder: dark ? '#333331' : '#e0e0de',
  }

  async function handleSubmit() {
    setError('')
    setSuccess('')
    if (!form.email || !form.password) { setError('Please fill in all fields'); return }
    if (mode === 'signup' && form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) setError(error.message)
      else navigate('/')
    } else {
      const { error } = await signUp(form.email, form.password)
      if (error) setError(error.message)
      else setSuccess('Account created! Check your email to confirm, then log in.')
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 38px',
    borderRadius: 10, border: `1px solid ${t.inputBorder}`,
    fontSize: 14, background: t.input, color: t.text,
    boxSizing: 'border-box', outline: 'none',
    transition: 'border 0.2s'
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '1rem' }}>

      {/* Theme toggle */}
      <button
        onClick={() => setDark(!dark)}
        style={{ position: 'fixed', top: 16, right: 16, background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: t.sub, fontSize: 16 }}
      >
        {dark ? <FiSun /> : <FiMoon />}
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>
            🏗️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: t.text, margin: '0 0 4px' }}>Construction OS</h1>
          <p style={{ fontSize: 13, color: t.sub, margin: 0 }}>Manage your projects, teams & budgets</p>
        </div>

        {/* Card */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 16, padding: '2rem' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: dark ? '#252523' : '#f0f0ee', borderRadius: 10, padding: 4, marginBottom: '1.5rem' }}>
            {['login', 'signup'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  background: mode === m ? t.card : 'transparent',
                  color: mode === m ? t.text : t.sub,
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize'
                }}
              >
                {m === 'login' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.sub, fontSize: 15 }} />
              <input
                style={inputStyle}
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.sub, fontSize: 15 }} />
              <input
                style={{ ...inputStyle, paddingRight: 40 }}
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.sub, fontSize: 15 }}
              >
                {showPass ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Confirm password (signup only) */}
            {mode === 'signup' && (
              <div style={{ position: 'relative' }}>
                <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: t.sub, fontSize: 15 }} />
                <input
                  style={inputStyle}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
              </div>
            )}
          </div>

          {/* Error / success */}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontSize: 13 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#E1F5EE', color: '#0F6E56', fontSize: 13 }}>
              {success}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', marginTop: 18, padding: '11px', borderRadius: 10,
              border: 'none', background: loading ? '#aaa' : '#1D9E75',
              color: '#fff', fontWeight: 600, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: t.border }} />
            <span style={{ fontSize: 12, color: t.sub }}>or</span>
            <div style={{ flex: 1, height: 1, background: t.border }} />
          </div>

          {/* Google OAuth */}
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
            }}
            style={{
              width: '100%', padding: '10px', borderRadius: 10,
              border: `1px solid ${t.border}`, background: t.input,
              color: t.text, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <span style={{ fontSize: 16 }}>G</span> Continue with Google
          </button>

        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: t.sub, marginTop: 16 }}>
          © 2025 Construction OS. All rights reserved.
        </p>
      </div>
    </div>
  )
}