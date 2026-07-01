import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiUser, FiLock, FiTrash2, FiSave, FiMoon, FiSun } from 'react-icons/fi'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { dark, setDark } = useTheme()
  const navigate = useNavigate()
  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({ email: user?.email || '', full_name: '', company: '', phone: '' })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const t = {
    bg: dark ? '#111110' : '#f5f5f3',
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    input: dark ? '#252523' : '#f9f9f7',
    inputBorder: dark ? '#333331' : '#e0e0de',
    hover: dark ? '#252523' : '#f5f5f3',
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single()
    if (data) setProfile({ email: user?.email || '', full_name: data.full_name || '', company: data.company || '', phone: data.phone || '' })
  }

  async function saveProfile() {
    setLoading(true)
    setError('')
    setSuccess('')

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: user?.id, full_name: profile.full_name, company: profile.company, phone: profile.phone })

    if (upsertError) setError(upsertError.message)
    else setSuccess('Profile updated successfully!')
    setLoading(false)
  }

  async function changePassword() {
    setError('')
    setSuccess('')
    if (!passwords.newPass) { setError('Enter a new password'); return }
    if (passwords.newPass.length < 6) { setError('Password must be at least 6 characters'); return }
    if (passwords.newPass !== passwords.confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
    if (error) setError(error.message)
    else { setSuccess('Password changed successfully!'); setPasswords({ current: '', newPass: '', confirm: '' }) }
    setLoading(false)
  }

  async function deleteAccount() {
    if (deleteConfirm !== 'DELETE') { setError('Type DELETE to confirm'); return }
    setLoading(true)
    await supabase.from('projects').delete().eq('user_id', user?.id)
    await signOut()
    navigate('/auth')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: `1px solid ${t.inputBorder}`, fontSize: 13,
    background: t.input, color: t.text, boxSizing: 'border-box', outline: 'none'
  }
  const labelStyle = { fontSize: 12, color: t.sub, display: 'block', marginBottom: 12 }
  const tabs = [
    { id: 'profile', label: 'Profile', icon: <FiUser size={14} /> },
    { id: 'password', label: 'Password', icon: <FiLock size={14} /> },
    { id: 'appearance', label: 'Appearance', icon: dark ? <FiSun size={14} /> : <FiMoon size={14} /> },
    { id: 'danger', label: 'Danger zone', icon: <FiTrash2 size={14} /> },
  ]

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>← Dashboard</button>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: t.text }}>Account settings</h1>
        <p style={{ fontSize: 13, color: t.sub, margin: '4px 0 0' }}>{user?.email}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: 4 }}>
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => { setTab(tb.id); setError(''); setSuccess('') }}
            style={{
              flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === tb.id ? t.hover : 'transparent',
              color: tab === tb.id ? t.text : t.sub,
              fontWeight: tab === tb.id ? 500 : 400,
              fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: tab === tb.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            {tb.icon}
            <span style={{ display: 'none' }} className="tab-label">{tb.label}</span>
            <span>{tb.label}</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#E1F5EE', color: '#0F6E56', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 1rem', color: t.text }}>Profile information</h2>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.25rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#fff', fontWeight: 600 }}>
              {(profile.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 2px', color: t.text }}>{profile.full_name || 'Your name'}</p>
              <p style={{ fontSize: 12, color: t.sub, margin: 0 }}>{profile.company || 'Your company'}</p>
            </div>
          </div>

          <label style={labelStyle}>Full name
            <input style={inputStyle} value={profile.full_name} placeholder="John Doe" onChange={e => setProfile({ ...profile, full_name: e.target.value })} />
          </label>
          <label style={labelStyle}>Email address
            <input style={{ ...inputStyle, background: t.hover, color: t.sub }} value={profile.email} disabled />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Company
              <input style={inputStyle} value={profile.company} placeholder="Your company" onChange={e => setProfile({ ...profile, company: e.target.value })} />
            </label>
            <label style={labelStyle}>Phone
              <input style={inputStyle} value={profile.phone} placeholder="+250 7XX XXX XXX" onChange={e => setProfile({ ...profile, phone: e.target.value })} />
            </label>
          </div>
          <button onClick={saveProfile} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
            <FiSave size={14} /> {loading ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 1rem', color: t.text }}>Change password</h2>
          <label style={labelStyle}>New password
            <input style={inputStyle} type={showPass ? 'text' : 'password'} value={passwords.newPass} placeholder="Min. 6 characters" onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} />
          </label>
          <label style={labelStyle}>Confirm new password
            <input style={inputStyle} type={showPass ? 'text' : 'password'} value={passwords.confirm} placeholder="Repeat new password" onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
          </label>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
            Show passwords
          </label>
          <button onClick={changePassword} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: '#185FA5', color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}>
            <FiLock size={14} /> {loading ? 'Updating...' : 'Update password'}
          </button>
        </div>
      )}

      {/* Appearance tab */}
      {tab === 'appearance' && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 1rem', color: t.text }}>Appearance</h2>
          <p style={{ fontSize: 13, color: t.sub, marginBottom: '1rem' }}>Choose how Construction OS looks for you.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Light mode', value: false, icon: '☀️', desc: 'Clean white interface' },
              { label: 'Dark mode', value: true, icon: '🌙', desc: 'Easy on the eyes at night' },
            ].map(opt => (
              <div
                key={opt.label}
                onClick={() => setDark(opt.value)}
                style={{
                  padding: '1rem', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${dark === opt.value ? '#1D9E75' : t.border}`,
                  background: dark === opt.value ? (dark ? '#1a2e26' : '#E1F5EE') : t.hover,
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
                <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 2px', color: t.text }}>{opt.label}</p>
                <p style={{ fontSize: 11, color: t.sub, margin: 0 }}>{opt.desc}</p>
                {dark === opt.value && (
                  <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 600, marginTop: 6, display: 'block' }}>✓ Active</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone tab */}
      {tab === 'danger' && (
        <div style={{ background: t.card, border: `1px solid #F5BDBD`, borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px', color: '#A32D2D' }}>Danger zone</h2>
          <p style={{ fontSize: 13, color: t.sub, marginBottom: '1.25rem' }}>These actions are permanent and cannot be undone.</p>

          <div style={{ padding: '1rem', background: '#FEF5F5', borderRadius: 10, border: '1px solid #F5BDBD' }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#A32D2D', margin: '0 0 4px' }}>Delete account</p>
            <p style={{ fontSize: 12, color: t.sub, margin: '0 0 12px' }}>This will permanently delete your account and all your projects.</p>
            <label style={labelStyle}>Type <strong>DELETE</strong> to confirm
              <input style={{ ...inputStyle, borderColor: '#F5BDBD' }} value={deleteConfirm} placeholder="DELETE" onChange={e => setDeleteConfirm(e.target.value)} />
            </label>
            <button onClick={deleteAccount} disabled={loading || deleteConfirm !== 'DELETE'} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: deleteConfirm === 'DELETE' ? '#A32D2D' : '#ccc', color: '#fff', fontWeight: 500, fontSize: 13, cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed' }}>
              <FiTrash2 size={14} /> {loading ? 'Deleting...' : 'Delete my account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}