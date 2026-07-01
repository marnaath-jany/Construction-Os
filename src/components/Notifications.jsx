import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiBell, FiX, FiAlertTriangle, FiDollarSign, FiCalendar, FiCheckCircle } from 'react-icons/fi'

export default function Notifications() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  const t = {
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    hover: dark ? '#252523' : '#f5f5f3',
    bg: dark ? '#111110' : '#f5f5f3',
  }

  useEffect(() => {
    if (user) {
      fetchNotifications()
      generateAlerts()
    }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  async function generateAlerts() {
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)

    if (!projects || projects.length === 0) return

    for (const p of projects) {
      const budget = parseFloat(p.budget) || 0
      const spent = parseFloat(p.spent) || 0
      const alerts = []

      // Over budget
      if (budget > 0 && spent > budget) {
        alerts.push({
          type: 'over_budget',
          message: `⚠️ ${p.name} is over budget by $${Math.round(spent - budget).toLocaleString()}`
        })
      }

      // Near budget (90%)
      if (budget > 0 && spent >= budget * 0.9 && spent < budget) {
        alerts.push({
          type: 'near_budget',
          message: `💰 ${p.name} has used ${Math.round(spent / budget * 100)}% of its budget`
        })
      }

      // Deadline alerts
      if (p.end_date) {
        const daysLeft = Math.round((new Date(p.end_date) - new Date()) / 86400000)
        if (daysLeft <= 7 && daysLeft >= 0 && p.status === 'active') {
          alerts.push({
            type: 'deadline',
            message: `📅 ${p.name} deadline is in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}!`
          })
        }
        if (daysLeft < 0 && p.status === 'active') {
          alerts.push({
            type: 'overdue',
            message: `🚨 ${p.name} is ${Math.abs(daysLeft)} days overdue!`
          })
        }
      }

      // Insert alerts — avoid duplicates within last 24 hours
      for (const alert of alerts) {
        const yesterday = new Date(Date.now() - 86400000).toISOString()
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('project_id', p.id)
          .eq('type', alert.type)
          .gte('created_at', yesterday)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert([{
            user_id: user.id,
            project_id: p.id,
            type: alert.type,
            message: alert.message,
          }])
        }
      }
    }

    fetchNotifications()
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  async function deleteNotification(e, id) {
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(notifications.filter(n => n.id !== id))
  }

  function getIcon(type) {
    if (type === 'over_budget') return <FiDollarSign size={14} style={{ color: '#A32D2D', flexShrink: 0 }} />
    if (type === 'near_budget') return <FiDollarSign size={14} style={{ color: '#854F0B', flexShrink: 0 }} />
    if (type === 'deadline') return <FiCalendar size={14} style={{ color: '#854F0B', flexShrink: 0 }} />
    if (type === 'overdue') return <FiAlertTriangle size={14} style={{ color: '#A32D2D', flexShrink: 0 }} />
    return <FiCheckCircle size={14} style={{ color: '#1D9E75', flexShrink: 0 }} />
  }

  function getNotifStyle(type, read) {
    if (read) return { bg: 'transparent', border: 'none' }
    if (type === 'over_budget' || type === 'overdue') return { bg: dark ? '#2a1515' : '#FEF5F5', border: 'none' }
    if (type === 'near_budget' || type === 'deadline') return { bg: dark ? '#2a2010' : '#FFFBF0', border: 'none' }
    return { bg: 'transparent', border: 'none' }
  }

  function timeAgo(date) {
    const diff = Math.round((Date.now() - new Date(date)) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`
    return `${Math.round(diff / 1440)}d ago`
  }

  const unread = notifications.filter(n => !n.read).length

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>

      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: 'none',
          border: 'none', cursor: 'pointer',
          padding: '6px', color: t.sub,
          display: 'flex', alignItems: 'center',
          borderRadius: 8,
          transition: 'background 0.15s'
        }}
        title="Notifications"
      >
        <FiBell size={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            width: 16, height: 16, borderRadius: '50%',
            background: '#D85A30', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          width: 300,
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
          zIndex: 1000,
          overflow: 'hidden'
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '12px 14px',
            borderBottom: `1px solid ${t.border}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiBell size={14} style={{ color: t.sub }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: '#D85A30', color: '#fff', fontWeight: 600 }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ fontSize: 11, color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.sub, display: 'flex', alignItems: 'center' }}
              >
                <FiX size={14} />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: t.sub }}>
                <FiBell size={28} style={{ marginBottom: 8, opacity: 0.4, display: 'block', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 13, margin: 0 }}>No notifications yet</p>
                <p style={{ fontSize: 11, margin: '4px 0 0', color: t.sub, opacity: 0.7 }}>
                  Alerts will appear here when projects go over budget or deadlines are close
                </p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const ns = getNotifStyle(n.type, n.read)
                return (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', gap: 10,
                      padding: '10px 14px',
                      borderBottom: i < notifications.length - 1 ? `1px solid ${t.border}` : 'none',
                      background: ns.bg,
                      transition: 'background 0.2s',
                      alignItems: 'flex-start'
                    }}
                  >
                    <div style={{ marginTop: 1 }}>{getIcon(n.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, color: t.text,
                        margin: '0 0 3px', lineHeight: 1.5,
                        fontWeight: n.read ? 400 : 500
                      }}>
                        {n.message}
                      </p>
                      <p style={{ fontSize: 10, color: t.sub, margin: 0 }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => deleteNotification(e, n.id)}
                      style={{
                        background: 'none', border: 'none',
                        cursor: 'pointer', color: t.sub,
                        padding: '2px 4px', flexShrink: 0,
                        display: 'flex', alignItems: 'center'
                      }}
                    >
                      <FiX size={11} />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '8px 14px',
              borderTop: `1px solid ${t.border}`,
              background: t.hover
            }}>
              <button
                onClick={async () => {
                  await supabase.from('notifications').delete().eq('user_id', user.id)
                  setNotifications([])
                }}
                style={{ fontSize: 11, color: '#A32D2D', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}