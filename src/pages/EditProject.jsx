import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useTheme } from '../context/ThemeContext'
import { FiSave, FiTrash2 } from 'react-icons/fi'

export default function EditProject() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    name: '', status: 'active', budget: '',
    spent: '', workers: '', start_date: '',
    end_date: '', progress: 0
  })

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

  useEffect(() => { fetchProject() }, [projectId])

  async function fetchProject() {
    const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single()
    if (error) { setError('Project not found'); setLoading(false); return }
    setForm({
      name: data.name || '',
      status: data.status || 'active',
      budget: data.budget || '',
      spent: data.spent || '',
      workers: data.workers || '',
      start_date: data.start_date || '',
      end_date: data.end_date || '',
      progress: data.progress || 0
    })
    setLoading(false)
  }

  async function saveProject() {
    if (!form.name) { setError('Project name is required'); return }
    setSaving(true)
    setError('')
    setSuccess('')
    const { error } = await supabase.from('projects').update({
      name: form.name,
      status: form.status,
      budget: parseFloat(form.budget) || 0,
      spent: parseFloat(form.spent) || 0,
      workers: parseInt(form.workers) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress: Math.min(100, Math.max(0, parseInt(form.progress) || 0))
    }).eq('id', projectId)

    setSaving(false)
    if (error) setError(error.message)
    else setSuccess('Project updated successfully!')
  }

  async function deleteProject() {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return
    setSaving(true)
    await supabase.from('projects').delete().eq('id', projectId)
    navigate('/')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 9,
    border: `1px solid ${t.inputBorder}`, fontSize: 13,
    background: t.input, color: t.text, boxSizing: 'border-box', outline: 'none'
  }
  const labelStyle = { fontSize: 12, color: t.sub, display: 'block', marginBottom: 14 }

  const statusOptions = [
    { value: 'active', label: '🟢 Active', color: '#0F6E56', bg: '#E1F5EE' },
    { value: 'on hold', label: '🟡 On hold', color: '#854F0B', bg: '#FAEEDA' },
    { value: 'completed', label: '🔵 Completed', color: '#185FA5', bg: '#E6F1FB' },
    { value: 'cancelled', label: '🔴 Cancelled', color: '#A32D2D', bg: '#FCEBEB' },
  ]

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: t.sub }}>Loading project...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6 }}>← Dashboard</button>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: t.text }}>Edit project</h1>
        <p style={{ fontSize: 13, color: t.sub, margin: '4px 0 0' }}>Update project details, status and progress</p>
      </div>

      {/* Feedback */}
      {error && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FCEBEB', color: '#A32D2D', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#E1F5EE', color: '#0F6E56', fontSize: 13, marginBottom: 12 }}>{success}</div>}

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '1.5rem' }}>

        {/* Project name */}
        <label style={labelStyle}>Project name *
          <input style={inputStyle} value={form.name} placeholder="e.g. Westside Mall Phase 2" onChange={e => setForm({ ...form, name: e.target.value })} />
        </label>

        {/* Status selector */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: t.sub, margin: '0 0 8px' }}>Project status</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {statusOptions.map(opt => (
              <div
                key={opt.value}
                onClick={() => setForm({ ...form, status: opt.value })}
                style={{
                  padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                  border: `2px solid ${form.status === opt.value ? opt.color : t.border}`,
                  background: form.status === opt.value ? opt.bg : t.hover,
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                <span style={{ fontSize: 13, fontWeight: form.status === opt.value ? 600 : 400, color: form.status === opt.value ? opt.color : t.sub }}>
                  {opt.label}
                </span>
                {form.status === opt.value && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: opt.color, fontWeight: 700 }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <label style={labelStyle}>
          Progress — <strong style={{ color: '#1D9E75' }}>{form.progress}%</strong>
          <input
            type="range" min="0" max="100" value={form.progress}
            onChange={e => setForm({ ...form, progress: e.target.value })}
            style={{ width: '100%', marginTop: 8, accentColor: '#1D9E75' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.sub, marginTop: 2 }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </label>

        {/* Budget + Spent */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={labelStyle}>Total budget ($)
            <input style={inputStyle} type="number" min="0" value={form.budget} placeholder="0" onChange={e => setForm({ ...form, budget: e.target.value })} />
          </label>
          <label style={labelStyle}>Amount spent ($)
            <input style={inputStyle} type="number" min="0" value={form.spent} placeholder="0" onChange={e => setForm({ ...form, spent: e.target.value })} />
          </label>
        </div>

        {/* Workers */}
        <label style={labelStyle}>Number of workers
          <input style={inputStyle} type="number" min="0" value={form.workers} placeholder="0" onChange={e => setForm({ ...form, workers: e.target.value })} />
        </label>

        {/* Dates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={labelStyle}>Start date
            <input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </label>
          <label style={labelStyle}>End date
            <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </label>
        </div>

        {/* Budget summary */}
        {form.budget > 0 && (
          <div style={{ padding: '10px 14px', background: t.hover, borderRadius: 9, marginBottom: 16, fontSize: 12, color: t.sub }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Budget remaining</span>
              <span style={{ fontWeight: 500, color: parseFloat(form.spent) > parseFloat(form.budget) ? '#A32D2D' : '#0F6E56' }}>
                ${Math.abs(parseFloat(form.budget || 0) - parseFloat(form.spent || 0)).toLocaleString()}
                {parseFloat(form.spent) > parseFloat(form.budget) ? ' over' : ' left'}
              </span>
            </div>
            <div style={{ height: 5, background: t.border, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (parseFloat(form.spent || 0) / parseFloat(form.budget || 1)) * 100)}%`, height: '100%', background: parseFloat(form.spent) > parseFloat(form.budget) ? '#D85A30' : '#1D9E75', borderRadius: 3 }} />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={saveProject}
            disabled={saving}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 9, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
          >
            <FiSave size={15} /> {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button
            onClick={deleteProject}
            style={{ padding: '10px 14px', borderRadius: 9, border: `1px solid #F5BDBD`, background: '#FEF5F5', color: '#A32D2D', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <FiTrash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}