import { useState } from 'react'
import { supabase } from '../supabase/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Projects() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    name: '', status: 'active', budget: '', workers: '',
    start_date: '', end_date: '', progress: 0
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit() {
    if (!form.name) { setError('Project name is required'); return }
    setSaving(true)
    const { error } = await supabase.from('projects').insert([{
      name: form.name,
      status: form.status,
      budget: parseFloat(form.budget) || 0,
      spent: 0,
      workers: parseInt(form.workers) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress: parseInt(form.progress) || 0,
      user_id: user.id
    }])
    setSaving(false)
    if (error) { setError(error.message); return }
    navigate('/')
  }

  const field = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '0.5px solid #ddd', fontSize: 13, marginTop: 4,
    boxSizing: 'border-box', background: '#fff', color: '#111'
  }
  const label = { fontSize: 12, color: '#888', display: 'block', marginBottom: 12 }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 520, margin: '2rem auto', padding: '0 1rem' }}>
      <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>← Back</button>
      <h1 style={{ fontSize: 20, fontWeight: 500, marginBottom: '1.5rem' }}>New project</h1>

      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1.25rem' }}>
        <label style={label}>Project name *
          <input style={field} name="name" value={form.name} onChange={handleChange} placeholder="e.g. Westside Mall Phase 2" />
        </label>
        <label style={label}>Status
          <select style={field} name="status" value={form.status} onChange={handleChange}>
            <option value="active">Active</option>
            <option value="on hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={label}>Budget ($)
            <input style={field} name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="0" />
          </label>
          <label style={label}>Workers
            <input style={field} name="workers" type="number" value={form.workers} onChange={handleChange} placeholder="0" />
          </label>
          <label style={label}>Start date
            <input style={field} name="start_date" type="date" value={form.start_date} onChange={handleChange} />
          </label>
          <label style={label}>End date
            <input style={field} name="end_date" type="date" value={form.end_date} onChange={handleChange} />
          </label>
        </div>
        <label style={label}>Progress (%)
          <input style={field} name="progress" type="number" min="0" max="100" value={form.progress} onChange={handleChange} />
        </label>

        {error && <p style={{ color: '#D85A30', fontSize: 12, marginBottom: 10 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
        >
          {saving ? 'Saving...' : 'Create project'}
        </button>
      </div>
    </div>
  )
}