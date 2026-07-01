import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { Link } from 'react-router-dom'
import { FiEdit2, FiShare2 } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function Dashboard() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [sharingId, setSharingId] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    else setProjects(data)
    setLoading(false)
  }

  async function deleteProject(id) {
    if (!window.confirm('Are you sure you want to delete this project?')) return
    await supabase.from('projects').delete().eq('id', id)
    setProjects(projects.filter(p => p.id !== id))
  }

  async function generateClientLink(projectId) {
    setSharingId(projectId)
    try {
      // Check if link already exists
      const { data: existing } = await supabase
        .from('client_links')
        .select('token')
        .eq('project_id', projectId)
        .single()

      let token
      if (existing) {
        token = existing.token
      } else {
        token = Math.random().toString(36).slice(2) + Date.now().toString(36)
        await supabase.from('client_links').insert([{ project_id: projectId, token }])
      }

      const url = `${window.location.origin}/client/${token}`
      await navigator.clipboard.writeText(url)
      alert(`✅ Client link copied to clipboard!\n\n${url}\n\nShare this link with your client. They can view project progress without logging in.`)
    } catch (err) {
      alert('Failed to generate link: ' + err.message)
    }
    setSharingId('')
  }

  // ✅ Fixed calculations
  const totalBudget = projects.reduce((s, p) => s + (parseFloat(p.budget) || 0), 0)
  const totalSpent = projects.reduce((s, p) => s + (parseFloat(p.spent) || 0), 0)
  const activeCount = projects.filter(p => p.status === 'active').length
  const onHoldCount = projects.filter(p => p.status === 'on hold').length
  const completedCount = projects.filter(p => p.status === 'completed').length

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.status === filter)

  function fmtMoney(n) {
    const num = parseFloat(n) || 0
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return '$' + Math.round(num / 1000) + 'K'
    return '$' + Math.round(num)
  }

  function statusColor(status) {
    if (status === 'active') return { bg: '#E1F5EE', color: '#0F6E56' }
    if (status === 'completed') return { bg: '#E6F1FB', color: '#185FA5' }
    if (status === 'on hold') return { bg: '#FAEEDA', color: '#854F0B' }
    if (status === 'cancelled') return { bg: '#FCEBEB', color: '#A32D2D' }
    return { bg: '#F1EFE8', color: '#5F5E5A' }
  }

  function statusEmoji(status) {
    if (status === 'active') return '🟢'
    if (status === 'completed') return '🔵'
    if (status === 'on hold') return '🟡'
    if (status === 'cancelled') return '🔴'
    return '⚪'
  }

  // Chart data
  const barData = projects.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
    Budget: parseFloat(p.budget) || 0,
    Spent: parseFloat(p.spent) || 0,
  }))

  const pieData = [
    { name: 'Active', value: activeCount },
    { name: 'On Hold', value: onHoldCount },
    { name: 'Completed', value: completedCount },
    { name: 'Cancelled', value: projects.filter(p => p.status === 'cancelled').length },
  ].filter(d => d.value > 0)

  const progressData = projects.map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name,
    Progress: parseFloat(p.progress) || 0,
  }))

  const PIE_COLORS = ['#1D9E75', '#854F0B', '#185FA5', '#A32D2D']

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 940, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>Construction OS</p>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Project Dashboard</h1>
        </div>
        <Link to="/projects/new">
          <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            + New Project
          </button>
        </Link>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total projects', value: projects.length, sub: `${activeCount} active · ${onHoldCount} on hold`, color: '#111' },
          { label: 'Total budget', value: fmtMoney(totalBudget), sub: 'Across all projects', color: '#111' },
          { label: 'Total spent', value: fmtMoney(totalSpent), sub: `${totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : 0}% burn rate`, color: '#111' },
          { label: 'Remaining', value: fmtMoney(totalBudget - totalSpent), sub: totalBudget - totalSpent < 0 ? '⚠️ Over budget' : 'Available budget', color: totalBudget - totalSpent < 0 ? '#D85A30' : '#1D9E75' },
          { label: 'Completed', value: completedCount, sub: `${projects.length > 0 ? Math.round(completedCount / projects.length * 100) : 0}% of total`, color: '#185FA5' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f5f5f3', borderRadius: 8, padding: '0.875rem 1rem' }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>{m.label}</p>
            <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: m.color }}>{m.value}</p>
            <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0' }}>{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {projects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>

          {/* Budget vs Spent */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Budget vs Spent</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`} />
                <Tooltip formatter={v => `$${v.toLocaleString()}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Budget" fill="#185FA5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Status Pie */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Status</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  outerRadius={65}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Progress overview */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem', gridColumn: '1 / -1' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#888', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Project Progress Overview</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={progressData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="Progress" radius={[4, 4, 0, 0]}>
                  {projects.map((p, i) => (
                    <Cell key={i} fill={
                      (parseFloat(p.progress) || 0) === 100 ? '#185FA5' :
                      (parseFloat(p.progress) || 0) > 66 ? '#1D9E75' :
                      (parseFloat(p.progress) || 0) > 33 ? '#F5A623' : '#D85A30'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'All', value: 'all', count: projects.length },
          { label: '🟢 Active', value: 'active', count: activeCount },
          { label: '🟡 On hold', value: 'on hold', count: onHoldCount },
          { label: '🔵 Completed', value: 'completed', count: completedCount },
          { label: '🔴 Cancelled', value: 'cancelled', count: projects.filter(p => p.status === 'cancelled').length },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              border: `0.5px solid ${filter === f.value ? '#1D9E75' : '#ddd'}`,
              background: filter === f.value ? '#E1F5EE' : '#fff',
              color: filter === f.value ? '#0F6E56' : '#888',
              fontWeight: filter === f.value ? 500 : 400,
              transition: 'all 0.15s'
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Projects list */}
      {loading ? (
        <p style={{ color: '#888', fontSize: 14 }}>Loading projects...</p>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #ddd', borderRadius: 12, color: '#aaa' }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>
            {filter === 'all' ? 'No projects yet' : `No ${filter} projects`}
          </p>
          {filter === 'all' && (
            <Link to="/projects/new">
              <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>
                Create your first project
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredProjects.map(p => {
            const sc = statusColor(p.status)
            const pct = Math.min(parseFloat(p.progress) || 0, 100)
            const budget = parseFloat(p.budget) || 0
            const spent = parseFloat(p.spent) || 0
            const remaining = budget - spent
            const isOverBudget = spent > budget && budget > 0
            const isSharing = sharingId === p.id

            return (
              <div
                key={p.id}
                style={{
                  background: '#fff',
                  border: `0.5px solid ${isOverBudget ? '#F5BDBD' : '#e5e5e5'}`,
                  borderRadius: 12, padding: '1rem 1.25rem'
                }}
              >
                {/* Title row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: 15, fontWeight: 500, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {statusEmoji(p.status)} {p.name}
                    </h2>
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                      {p.start_date || '—'} → {p.end_date || '—'} · {p.workers || 0} workers
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {p.status}
                    </span>
                    <button
                      onClick={() => deleteProject(p.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14, padding: '2px 6px', borderRadius: 4 }}
                      title="Delete project"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                    <span>Progress</span>
                    <span style={{ fontWeight: 500 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: pct + '%', height: '100%',
                      background: pct === 100 ? '#185FA5' : pct > 66 ? '#1D9E75' : pct > 33 ? '#F5A623' : '#D85A30',
                      borderRadius: 3, transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>

                {/* Budget row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Budget: <strong style={{ color: '#111' }}>{fmtMoney(budget)}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Spent: <strong style={{ color: isOverBudget ? '#D85A30' : '#111' }}>{fmtMoney(spent)}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: '#888' }}>
                      Remaining: <strong style={{ color: isOverBudget ? '#D85A30' : '#1D9E75' }}>
                        {isOverBudget ? '-' : ''}{fmtMoney(Math.abs(remaining))}
                      </strong>
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link to={`/projects/${p.id}/edit`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FiEdit2 size={11} /> Edit
                      </button>
                    </Link>
                    <button
                      onClick={() => generateClientLink(p.id)}
                      disabled={isSharing}
                      style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333', display: 'flex', alignItems: 'center', gap: 4 }}
                      title="Generate read-only link for client"
                    >
                      <FiShare2 size={11} /> {isSharing ? 'Copying...' : 'Share'}
                    </button>
                    <Link to={`/boq/${p.id}`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333' }}>
                        BOQ
                      </button>
                    </Link>
                    <Link to={`/gantt/${p.id}`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333' }}>
                        Gantt
                      </button>
                    </Link>
                    <Link to={`/reports/${p.id}`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333' }}>
                        Reports
                      </button>
                    </Link>
                    <Link to={`/team/${p.id}`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333' }}>
                        Team
                      </button>
                    </Link>
                    <Link to={`/documents/${p.id}`}>
                      <button style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#333' }}>
                        Docs
                      </button>
                    </Link>
                  </div>
                </div>

                {/* Over budget warning */}
                {isOverBudget && (
                  <div style={{ marginTop: 10, padding: '7px 12px', background: '#FCEBEB', borderRadius: 8, fontSize: 12, color: '#A32D2D' }}>
                    ⚠️ Over budget by {fmtMoney(spent - budget)}
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