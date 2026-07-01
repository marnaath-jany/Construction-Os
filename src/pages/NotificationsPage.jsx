import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiBell, FiX, FiAlertTriangle, FiDollarSign, FiCalendar, FiCheckCircle } from 'react-icons/fi'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { dark } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const t = {
    bg: dark ? '#111110' : '#f5f5f3',
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    hover: dark ? '#252523' : '#f5f5f3',
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      generateAlerts()
    }
  }, [user])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setLoading(false)
  }

  async function generateAlerts() {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)

    if (!projects) return

    const alerts = []

    for (const p of projects) {
      const budget = parseFloat(p.budget) || 0
      const spent = parseFloat(p.spent) || 0

      if (budget > 0 && spent > budget) {
        alerts.push({
          user_id: user.id,
          project_id: p.id,
          type: 'over_budget',
          message: `⚠️ ${p.name} is over budget by $${Math.round(spent - budget).toLocaleString()}`,
        })
      }

      if (budget > 0 && spent >= budget * 0.9 && spent <= budget) {
        alerts.push({
          user_id: user.id,
          project_id: p.id,
          type: 'near_budget',
          message: `💰 ${p.name} has used ${Math.round((spent / budget) * 100)}% of its budget`,
        })
      }

      if (p.end_date) {
        const daysLeft = Math.round((new Date(p.end_date) - new Date()) / 86400000)
        if (daysLeft <= 7 && daysLeft >= 0 && p.status === 'active') {
          alerts.push({
            user_id: user.id,
            project_id: p.id,
            type: 'deadline',
            message: `📅 ${p.name} deadline is in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`,
          })
        }
        if (daysLeft < 0 && p.status === 'active') {
          alerts.push({
            user_id: user.id,
            project_id: p.id,
            type: 'overdue',
            message: `🚨 ${p.name} is ${Math.abs(daysLeft)} days overdue!`,
          })
        }
      }
    }

    for (const alert of alerts) {
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('project_id', alert.project_id)
        .eq('type', alert.type)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())

      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert([alert])
      }
    }

    fetchNotifications()
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  async function deleteNotification(id) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(notifications.filter(n => n.id !== id))
  }

  function getIcon(type) {
    if (type === 'over_budget' || type === 'near_budget') return <FiDollarSign size={16} style={{ color: '#A32D2D' }} />
    if (type === 'deadline') return <FiCalendar size={16} style={{ color: '#854F0B' }} />
    if (type === 'overdue') return <FiAlertTriangle size={16} style={{ color: '#A32D2D' }} />
    return <FiCheckCircle size={16} style={{ color: '#1D9E75' }} />
  }

  function getNotifBg(type) {
    if (type === 'over_budget' || type === 'overdue') return { bg: '#FCEBEB', border: '#F5BDBD' }
    if (type === 'near_budget' || type === 'deadline') return { bg: '#FAEEDA', border: '#F0CC8A' }
    return { bg: '#E1F5EE', border: '#A8DFC0' }
  }

  function timeAgo(date) {
    const diff = Math.round((Date.now() - new Date(date)) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`
    return `${Math.round(diff / 1440)}d ago`
  }

  const unread = notifications.filter(n => !n.read).length

  if (loading) {
    return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: t.sub }}>Loading notifications...</p>
  }

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 920, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Notifications</h1>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #1D9E75', background: '#E1F5EE', color: '#0F6E56', cursor: 'pointer', fontSize: 13 }}
          >
            Mark all read
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notifications.length === 0 ? (
          <div style={{ background: t.card, border: `1px dashed ${t.border}`, borderRadius: 12, padding: '3rem 1rem', textAlign: 'center', color: t.sub }}>
            <FiBell size={28} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0 }}>No notifications yet</p>
          </div>
        ) : (
          notifications.map(n => {
            const nc = getNotifBg(n.type)
            return (
              <div key={n.id} style={{
                background: n.read ? t.card : nc.bg,
                border: `1px solid ${n.read ? t.border : nc.border}`,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <div style={{ marginTop: 2, flexShrink: 0 }}>{getIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: t.text, margin: '0 0 4px', lineHeight: 1.5 }}>{n.message}</p>
                  <p style={{ fontSize: 11, color: t.sub, margin: 0 }}>{timeAgo(n.created_at)}</p>
                </div>
                <button
                  onClick={() => deleteNotification(n.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.sub, padding: '2px 4px' }}
                  title="Delete notification"
                >
                  <FiX size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
