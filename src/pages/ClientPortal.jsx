import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase/client'

export default function ClientPortal() {
  const { token } = useParams()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchData() }, [token])

  async function fetchData() {
    const { data: link } = await supabase
      .from('client_links').select('*').eq('token', token).single()

    if (!link) { setError('Invalid or expired link'); setLoading(false); return }

    const { data: proj } = await supabase
      .from('projects').select('*').eq('id', link.project_id).single()
    setProject(proj)

    const { data: t } = await supabase
      .from('tasks').select('*').eq('project_id', link.project_id).order('start_date')
    setTasks(t || [])

    const { data: r } = await supabase
      .from('site_reports').select('*').eq('project_id', link.project_id)
      .order('report_date', { ascending: false }).limit(5)
    setReports(r || [])

    setLoading(false)
  }

  function fmtMoney(n) {
    const num = parseFloat(n) || 0
    if (num >= 1000000) return '$' + (num/1000000).toFixed(1) + 'M'
    if (num >= 1000) return '$' + Math.round(num/1000) + 'K'
    return '$' + Math.round(num)
  }

  const pct = Math.min(parseFloat(project?.progress) || 0, 100)
  const budget = parseFloat(project?.budget) || 0
  const spent = parseFloat(project?.spent) || 0

  if (loading) return (
    <div style={{ fontFamily: 'sans-serif', padding: '3rem', textAlign: 'center', color: '#888' }}>
      Loading project...
    </div>
  )

  if (error) return (
    <div style={{ fontFamily: 'sans-serif', padding: '3rem', textAlign: 'center' }}>
      <p style={{ fontSize: 48, marginBottom: 12 }}>🔒</p>
      <h2 style={{ color: '#A32D2D' }}>Invalid link</h2>
      <p style={{ color: '#888' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
        <span style={{ fontSize: 28 }}>🏗️</span>
        <div>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Construction OS — Client View</p>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{project?.name}</h1>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#E1F5EE', color: '#0F6E56', fontWeight: 500 }}>
          🔒 Read only
        </span>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Progress', value: `${pct}%`, color: '#1D9E75' },
          { label: 'Budget', value: fmtMoney(budget), color: '#111' },
          { label: 'Spent', value: fmtMoney(spent), color: spent > budget ? '#A32D2D' : '#111' },
          { label: 'Workers', value: project?.workers || 0, color: '#111' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f5f5f3', borderRadius: 10, padding: '1rem' }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>{m.label}</p>
            <p style={{ fontSize: 20, fontWeight: 600, margin: 0, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 }}>
          <span>Overall progress</span><span style={{ fontWeight: 600, color: '#1D9E75' }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #1D9E75, #2EC78A)', borderRadius: 5, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 4 }}>
          <span>Start: {project?.start_date || '—'}</span>
          <span>End: {project?.end_date || '—'}</span>
        </div>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasks</p>
          {tasks.map(t => {
            const statusColor = { 'completed': '#1D9E75', 'in progress': '#185FA5', 'pending': '#888', 'at risk': '#D85A30' }
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[t.status] || '#888', flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1, color: '#111' }}>{t.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f5f5f3', color: '#888', textTransform: 'capitalize' }}>{t.status}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Recent site reports */}
      {reports.length > 0 && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recent site reports</p>
          {reports.map(r => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '0.5px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{r.report_date}</span>
                <span style={{ fontSize: 11, color: '#888' }}>{r.weather} · {r.workers_present} workers</span>
              </div>
              <p style={{ fontSize: 12, color: '#555', margin: 0, lineHeight: 1.5 }}>{r.work_done}</p>
            </div>
          ))}
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', marginTop: '2rem' }}>
        Powered by Construction OS · Read-only view
      </p>
    </div>
  )
}