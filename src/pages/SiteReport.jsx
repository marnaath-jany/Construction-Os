import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useTheme } from '../ThemeContext'
import { exportSiteReportPDF } from '../utils/exportPDF'

export default function SiteReport() {
  const { isDark, theme } = useTheme()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    report_date: new Date().toISOString().split('T')[0],
    weather: 'Sunny',
    workers_present: '',
    work_done: '',
    issues: ''
  })

  useEffect(() => { fetchAll() }, [projectId])

  async function fetchAll() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(proj)
    const { data: reps } = await supabase
      .from('site_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('report_date', { ascending: false })
    setReports(reps || [])
    setLoading(false)
  }

  async function submitReport() {
    if (!form.work_done) { alert('Please describe work done'); return }
    setSaving(true)
    const { error } = await supabase.from('site_reports').insert([{
      project_id: projectId,
      report_date: form.report_date,
      weather: form.weather,
      workers_present: parseInt(form.workers_present) || 0,
      work_done: form.work_done,
      issues: form.issues
    }])
    setSaving(false)
    if (!error) {
      setShowForm(false)
      setForm({ report_date: new Date().toISOString().split('T')[0], weather: 'Sunny', workers_present: '', work_done: '', issues: '' })
      fetchAll()
    }
  }

  async function deleteReport(id) {
    await supabase.from('site_reports').delete().eq('id', id)
    setReports(reports.filter(r => r.id !== id))
  }

  function getWeatherStyle(weather) {
    const styles = {
      'Sunny': { bg: isDark ? '#4A3419' : '#FAEEDA', color: isDark ? '#FFD09E' : '#854F0B' },
      'Cloudy': { bg: isDark ? '#2D2D2D' : '#F1EFE8', color: isDark ? '#AAAAAA' : '#5F5E5A' },
      'Rainy': { bg: isDark ? '#0A2D4D' : '#E6F1FB', color: isDark ? '#7AB7F0' : '#185FA5' },
      'Windy': { bg: isDark ? '#1A164D' : '#EEEDFE', color: isDark ? '#A59EFF' : '#534AB7' },
      'Stormy': { bg: isDark ? '#4A1D1D' : '#FCEBEB', color: isDark ? '#FF9E9E' : '#A32D2D' },
    }
    return styles[weather] || { bg: theme.itemBg, color: theme.muted }
  }

  const inputStyle = { 
    width: '100%', padding: '8px 10px', borderRadius: 8, 
    border: `0.5px solid ${theme.border}`, fontSize: 13, 
    boxSizing: 'border-box', background: theme.inputBg, color: theme.text 
  }
  const labelStyle = { fontSize: 12, color: theme.muted, display: 'block', marginBottom: 12 }

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: theme.muted }}>Loading reports...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto', padding: '2rem 1rem', color: theme.text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: theme.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>← Dashboard</button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project?.name} — Site Reports</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => exportSiteReportPDF(project, reports)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            📄 Export PDF
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ New Report'}
          </button>
        </div>
      </div>

      {/* New report form */}
      {showForm && (
        <div style={{ background: theme.card, border: `0.5px solid ${theme.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>Daily site report</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Date
              <input style={inputStyle} type="date" value={form.report_date} onChange={e => setForm({ ...form, report_date: e.target.value })} />
            </label>
            <label style={labelStyle}>Weather
              <select style={inputStyle} value={form.weather} onChange={e => setForm({ ...form, weather: e.target.value })}>
                {['Sunny', 'Cloudy', 'Rainy', 'Windy', 'Stormy'].map(w => <option key={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <label style={labelStyle}>Workers present
            <input style={inputStyle} type="number" min="0" value={form.workers_present} placeholder="0" onChange={e => setForm({ ...form, workers_present: e.target.value })} />
          </label>
          <label style={labelStyle}>Work done today *
            <textarea
              style={{ ...inputStyle, height: 100, resize: 'vertical', fontFamily: 'sans-serif', color: theme.text }}
              value={form.work_done}
              placeholder="Describe what was accomplished today..."
              onChange={e => setForm({ ...form, work_done: e.target.value })}
            />
          </label>
          <label style={labelStyle}>Issues / delays
            <textarea
              style={{ ...inputStyle, height: 70, resize: 'vertical', fontFamily: 'sans-serif', color: theme.text }}
              value={form.issues}
              placeholder="Any problems, delays, or safety issues..."
              onChange={e => setForm({ ...form, issues: e.target.value })}
            />
          </label>
          <button
            onClick={submitReport}
            disabled={saving}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Submit report'}
          </button>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: `1px dashed ${theme.border}`, borderRadius: 12, color: theme.muted }}>
          <p>No reports yet — submit your first daily report</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => {
            const wc = getWeatherStyle(r.weather)
            return (
              <div key={r.id} style={{ background: theme.card, border: `0.5px solid ${theme.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{r.report_date}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: wc.bg, color: wc.color, fontWeight: 500 }}>{r.weather}</span>
                    <span style={{ fontSize: 12, color: theme.muted }}>{r.workers_present} workers</span>
                  </div>
                  <button onClick={() => deleteReport(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.muted, fontSize: 13 }}>✕</button>
                </div>
                <p style={{ fontSize: 13, color: theme.text, marginBottom: r.issues ? 8 : 0, lineHeight: 1.6 }}>{r.work_done}</p>
                {r.issues && (
                  <div style={{ background: isDark ? '#4A1D1D' : '#FCEBEB', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: isDark ? '#FF9E9E' : '#A32D2D' }}>
                    <strong>Issues:</strong> {r.issues}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}