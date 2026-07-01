import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'

const STATUSES = ['pending', 'in progress', 'completed', 'at risk']
const STATUS_COLORS = {
  'pending':     { bg: '#F1EFE8', color: '#5F5E5A', bar: '#C8C6BE' },
  'in progress': { bg: '#E6F1FB', color: '#185FA5', bar: '#185FA5' },
  'completed':   { bg: '#E1F5EE', color: '#0F6E56', bar: '#1D9E75' },
  'at risk':     { bg: '#FCEBEB', color: '#A32D2D', bar: '#D85A30' },
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function Gantt() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState({
    name: '', assignee: '', status: 'pending',
    start_date: new Date().toISOString().split('T')[0],
    end_date: addDays(new Date().toISOString().split('T')[0], 7)
  })

  useEffect(() => { fetchAll() }, [projectId])

  async function fetchAll() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(proj)
    const { data: t } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date')
    setTasks(t || [])
    setLoading(false)
  }

  // Calculate Gantt date range
  function getRange() {
    if (tasks.length === 0) {
      const today = new Date().toISOString().split('T')[0]
      return { start: today, totalDays: 30 }
    }
    const starts = tasks.map(t => t.start_date).filter(Boolean).sort()
    const ends = tasks.map(t => t.end_date).filter(Boolean).sort()
    const start = starts[0]
    const end = ends[ends.length - 1]
    const totalDays = Math.max(daysBetween(start, end) + 7, 30)
    return { start, totalDays }
  }

  async function saveTask() {
    if (!form.name) { alert('Task name is required'); return }
    setSaving(true)
    if (editTask) {
      await supabase.from('tasks').update({
        name: form.name, assignee: form.assignee,
        status: form.status, start_date: form.start_date, end_date: form.end_date
      }).eq('id', editTask)
    } else {
      await supabase.from('tasks').insert([{
        project_id: projectId, name: form.name,
        assignee: form.assignee, status: form.status,
        start_date: form.start_date, end_date: form.end_date
      }])
    }
    setSaving(false)
    setShowForm(false)
    setEditTask(null)
    setForm({ name: '', assignee: '', status: 'pending', start_date: new Date().toISOString().split('T')[0], end_date: addDays(new Date().toISOString().split('T')[0], 7) })
    fetchAll()
  }

  async function deleteTask(id) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(tasks.filter(t => t.id !== id))
  }

  async function updateStatus(id, status) {
    await supabase.from('tasks').update({ status }).eq('id', id)
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
  }

  function openEdit(task) {
    setForm({ name: task.name, assignee: task.assignee || '', status: task.status, start_date: task.start_date, end_date: task.end_date })
    setEditTask(task.id)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditTask(null)
    setForm({ name: '', assignee: '', status: 'pending', start_date: new Date().toISOString().split('T')[0], end_date: addDays(new Date().toISOString().split('T')[0], 7) })
  }

  // Build week headers for Gantt
  function buildWeekHeaders(start, totalDays) {
    const headers = []
    let current = new Date(start)
    let dayCount = 0
    while (dayCount < totalDays) {
      const weekStart = current.toISOString().split('T')[0]
      const label = current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const daysInWeek = Math.min(7, totalDays - dayCount)
      headers.push({ label, days: daysInWeek })
      current.setDate(current.getDate() + 7)
      dayCount += 7
    }
    return headers
  }

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid #ddd', fontSize: 13, boxSizing: 'border-box', background: '#fff', color: '#111' }
  const labelStyle = { fontSize: 12, color: '#888', display: 'block', marginBottom: 12 }

  const completed = tasks.filter(t => t.status === 'completed').length
  const inProgress = tasks.filter(t => t.status === 'in progress').length
  const atRisk = tasks.filter(t => t.status === 'at risk').length

  const { start: rangeStart, totalDays } = getRange()
  const weekHeaders = buildWeekHeaders(rangeStart, totalDays)
  const DAY_WIDTH = 28 // px per day
  const today = new Date().toISOString().split('T')[0]
  const todayOffset = Math.max(0, daysBetween(rangeStart, today))

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: '#888' }}>Loading Gantt...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 1100, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>← Dashboard</button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project?.name} — Gantt Chart</h1>
        </div>
        <button
          onClick={() => { cancelForm(); setShowForm(true) }}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          + Add Task
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total tasks', value: tasks.length },
          { label: 'Completed', value: completed },
          { label: 'In progress', value: inProgress },
          { label: 'At risk', value: atRisk },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f5f5f3', borderRadius: 8, padding: '0.875rem 1rem' }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>{m.label}</p>
            <p style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Task form */}
      {showForm && (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem' }}>{editTask ? 'Edit task' : 'New task'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Task name *
              <input style={inputStyle} value={form.name} placeholder="e.g. Foundation works" onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={labelStyle}>Assignee
              <input style={inputStyle} value={form.assignee} placeholder="e.g. Alain Kagabo" onChange={e => setForm({ ...form, assignee: e.target.value })} />
            </label>
            <label style={labelStyle}>Start date
              <input style={inputStyle} type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </label>
            <label style={labelStyle}>End date
              <input style={inputStyle} type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </label>
          </div>
          <label style={labelStyle}>Status
            <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveTask} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editTask ? 'Update task' : 'Add task'}
            </button>
            <button onClick={cancelForm} style={{ padding: '10px 20px', borderRadius: 8, border: '0.5px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gantt Chart */}
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed #ddd', borderRadius: 12, color: '#aaa' }}>
          <p>No tasks yet — add your first task to see the Gantt chart</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 240 + totalDays * DAY_WIDTH }}>

              {/* Week headers */}
              <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
                <div style={{ width: 240, minWidth: 240, padding: '8px 12px', fontSize: 11, color: '#888', fontWeight: 500, background: '#fafafa', borderRight: '0.5px solid #eee' }}>
                  TASK
                </div>
                <div style={{ position: 'relative', flex: 1 }}>
                  <div style={{ display: 'flex' }}>
                    {weekHeaders.map((wh, i) => (
                      <div key={i} style={{ width: wh.days * DAY_WIDTH, fontSize: 10, color: '#aaa', padding: '8px 4px', borderRight: '0.5px solid #f0f0f0', background: '#fafafa', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {wh.label}
                      </div>
                    ))}
                  </div>
                  {/* Today line header */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div style={{ position: 'absolute', top: 0, left: todayOffset * DAY_WIDTH, width: 2, height: '100%', background: '#D85A30', opacity: 0.6 }} />
                  )}
                </div>
              </div>

              {/* Task rows */}
              {tasks.map((task, idx) => {
                const sc = STATUS_COLORS[task.status] || STATUS_COLORS['pending']
                const taskStart = task.start_date
                const taskEnd = task.end_date
                const offsetDays = taskStart ? Math.max(0, daysBetween(rangeStart, taskStart)) : 0
                const durationDays = (taskStart && taskEnd) ? Math.max(1, daysBetween(taskStart, taskEnd)) : 1
                const barWidth = Math.min(durationDays * DAY_WIDTH, (totalDays - offsetDays) * DAY_WIDTH)

                return (
                  <div key={task.id} style={{ display: 'flex', borderBottom: idx < tasks.length - 1 ? '0.5px solid #f5f5f3' : 'none', minHeight: 44 }}>
                    {/* Task label */}
                    <div style={{ width: 240, minWidth: 240, padding: '10px 12px', borderRight: '0.5px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
                        <button onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: '1px 4px', flexShrink: 0 }}>✎</button>
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 12, padding: '1px 4px', flexShrink: 0 }}>✕</button>
                      </div>
                      {task.assignee && <span style={{ fontSize: 11, color: '#aaa' }}>{task.assignee}</span>}
                      <select
                        value={task.status}
                        onChange={e => updateStatus(task.id, e.target.value)}
                        style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontWeight: 500, cursor: 'pointer', width: 'fit-content', marginTop: 2 }}
                      >
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Gantt bar area */}
                    <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                      {/* Grid lines */}
                      {weekHeaders.map((wh, i) => (
                        <div key={i} style={{ position: 'absolute', left: weekHeaders.slice(0, i).reduce((s, w) => s + w.days * DAY_WIDTH, 0), width: wh.days * DAY_WIDTH, height: '100%', borderRight: '0.5px solid #f5f5f3' }} />
                      ))}
                      {/* Today line */}
                      {todayOffset >= 0 && todayOffset <= totalDays && (
                        <div style={{ position: 'absolute', left: todayOffset * DAY_WIDTH, width: 2, height: '100%', background: '#D85A30', opacity: 0.4, zIndex: 1 }} />
                      )}
                      {/* Bar */}
                      {taskStart && (
                        <div
                          title={`${formatDate(taskStart)} → ${formatDate(taskEnd)}`}
                          style={{
                            position: 'absolute',
                            left: offsetDays * DAY_WIDTH + 2,
                            width: Math.max(barWidth - 4, 20),
                            height: 22,
                            background: sc.bar,
                            borderRadius: 6,
                            opacity: 0.85,
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: 8,
                            zIndex: 2,
                            cursor: 'default'
                          }}
                        >
                          <span style={{ fontSize: 10, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {durationDays}d
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '10px 16px', borderTop: '0.5px solid #eee', flexWrap: 'wrap' }}>
            {Object.entries(STATUS_COLORS).map(([status, sc]) => (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: sc.bar }} />
                <span style={{ fontSize: 11, color: '#888', textTransform: 'capitalize' }}>{status}</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 2, height: 12, background: '#D85A30', opacity: 0.6 }} />
              <span style={{ fontSize: 11, color: '#888' }}>Today</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}