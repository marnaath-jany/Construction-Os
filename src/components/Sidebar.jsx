import { Link, useLocation, useParams, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase/client'
import {
  FiHome, FiDollarSign, FiCalendar, FiFileText,
  FiUsers, FiFolder, FiPlus, FiLogOut, FiSun,
  FiMoon, FiChevronLeft, FiChevronRight, FiSettings,
  FiX
} from 'react-icons/fi'

export default function Sidebar({ onClose }) {
  const { dark, setDark } = useTheme()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [activeProject, setActiveProject] = useState(null)
  const [projectsOpen, setProjectsOpen] = useState(true)

  const t = {
    bg: dark ? '#1a1a18' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e8e8e6',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#77756e' : '#888784',
    hover: dark ? '#252523' : '#f5f5f3',
    active: dark ? '#2e2e2b' : '#f0f0ee',
    activeBorder: '#1D9E75',
    danger: '#D85A30',
  }

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    if (projectId && projects.length > 0) {
      const p = projects.find(p => p.id === projectId)
      setActiveProject(p || null)
    } else {
      setActiveProject(null)
    }
  }, [projectId, projects])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, progress')
      .order('created_at', { ascending: false })
    setProjects(data || [])
  }

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  function statusDot(status) {
    if (status === 'active') return '#1D9E75'
    if (status === 'completed') return '#185FA5'
    if (status === 'on hold') return '#854F0B'
    if (status === 'cancelled') return '#A32D2D'
    return '#888784'
  }

  const isActive = (path) => location.pathname === path

  const projectModules = projectId ? [
    { to: `/boq/${projectId}`,       icon: <FiDollarSign size={15} />, label: 'BOQ & Budget' },
    { to: `/gantt/${projectId}`,     icon: <FiCalendar size={15} />,   label: 'Gantt Chart' },
    { to: `/reports/${projectId}`,   icon: <FiFileText size={15} />,   label: 'Site Reports' },
    { to: `/team/${projectId}`,      icon: <FiUsers size={15} />,      label: 'Team & Payroll' },
    { to: `/documents/${projectId}`, icon: <FiFolder size={15} />,     label: 'Documents' },
  ] : []

  const W = collapsed ? 64 : 240

  return (
    <div style={{
      width: W, minWidth: W, height: '100vh',
      position: 'sticky', top: 0,
      background: t.bg, borderRight: `1px solid ${t.border}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif',
      transition: 'width 0.2s ease, min-width 0.2s ease',
      overflow: 'hidden', zIndex: 50,
      flexShrink: 0
    }}>

      {/* Logo + collapse */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? '16px 0' : '16px 12px',
        borderBottom: `1px solid ${t.border}`,
        minHeight: 56
      }}>
        {!collapsed && (
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏗️</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: t.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              Construction OS
            </span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🏗️</span>
          </Link>
        )}

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {/* Mobile close button */}
          {onClose && !collapsed && (
            <button
              onClick={onClose}
              style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: t.sub, display: 'flex', alignItems: 'center' }}
            >
              <FiX size={13} />
            </button>
          )}
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: t.sub, display: 'flex', alignItems: 'center', flexShrink: 0 }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight size={13} /> : <FiChevronLeft size={13} />}
          </button>
        </div>
      </div>

      {/* Scrollable nav */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 8px' }}>

        {/* Dashboard */}
        <NavItem
          to="/"
          icon={<FiHome size={15} />}
          label="Dashboard"
          active={isActive('/')}
          collapsed={collapsed}
          t={t}
        />

        {/* Divider */}
        <div style={{ height: 1, background: t.border, margin: '8px 0' }} />

        {/* Active project modules */}
        {projectId && activeProject && (
          <>
            <div style={{ padding: collapsed ? '0' : '0 6px', marginBottom: 4 }}>
              {!collapsed && (
                <p style={{
                  fontSize: 10, fontWeight: 600, color: t.sub,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  margin: '0 0 4px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {activeProject.name}
                </p>
              )}
            </div>

            {projectModules.map(m => (
              <NavItem
                key={m.to}
                to={m.to}
                icon={m.icon}
                label={m.label}
                active={isActive(m.to)}
                collapsed={collapsed}
                t={t}
              />
            ))}

            {/* Project progress mini bar */}
            {!collapsed && (
              <div style={{
                margin: '8px 6px',
                padding: '8px 10px',
                background: t.hover,
                borderRadius: 8,
                border: `1px solid ${t.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.sub, marginBottom: 4 }}>
                  <span>Progress</span>
                  <span style={{ fontWeight: 600, color: '#1D9E75' }}>{activeProject.progress || 0}%</span>
                </div>
                <div style={{ height: 4, background: t.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${activeProject.progress || 0}%`,
                    height: '100%', background: '#1D9E75',
                    borderRadius: 2, transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}

            <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
          </>
        )}

        {/* Projects section */}
        <div style={{ padding: collapsed ? '0' : '0 6px', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && (
            <>
              <p style={{
                fontSize: 10, fontWeight: 600, color: t.sub,
                textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0
              }}>
                Projects
              </p>
              <button
                onClick={() => setProjectsOpen(!projectsOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.sub, fontSize: 10, padding: '2px 4px' }}
              >
                {projectsOpen ? '▲' : '▼'}
              </button>
            </>
          )}
        </div>

        {/* Projects list */}
        {(projectsOpen || collapsed) && (
          <>
            {projects.map(p => (
              <Link key={p.id} to={`/boq/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: collapsed ? '8px 0' : '6px 10px',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: projectId === p.id ? t.active : 'transparent',
                  borderLeft: projectId === p.id ? `2px solid ${t.activeBorder}` : '2px solid transparent',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'background 0.15s'
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusDot(p.status), flexShrink: 0
                  }} />
                  {!collapsed && (
                    <span style={{
                      fontSize: 13,
                      color: projectId === p.id ? t.text : t.sub,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', flex: 1,
                      fontWeight: projectId === p.id ? 500 : 400
                    }}>
                      {p.name}
                    </span>
                  )}
                  {!collapsed && (
                    <span style={{
                      fontSize: 10, color: t.sub,
                      background: t.hover, padding: '1px 5px',
                      borderRadius: 10, flexShrink: 0
                    }}>
                      {p.progress || 0}%
                    </span>
                  )}
                </div>
              </Link>
            ))}

            {projects.length === 0 && !collapsed && (
              <p style={{ fontSize: 12, color: t.sub, padding: '4px 10px', margin: 0 }}>
                No projects yet
              </p>
            )}
          </>
        )}

        {/* New project button */}
        <Link to="/projects/new" style={{ textDecoration: 'none' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: collapsed ? '8px 0' : '6px 10px',
            borderRadius: 8, cursor: 'pointer', marginTop: 4,
            color: t.sub, justifyContent: collapsed ? 'center' : 'flex-start',
            border: `1px dashed ${t.border}`,
            transition: 'all 0.15s'
          }}>
            <FiPlus size={14} />
            {!collapsed && <span style={{ fontSize: 13 }}>New project</span>}
          </div>
        </Link>

      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: `1px solid ${t.border}`, padding: '10px 8px' }}>

        {/* Notifications page link */}
        <NavItem
          to="/notifications"
          icon={<FiBell size={15} />}
          label="Notifications"
          active={isActive('/notifications')}
          collapsed={collapsed}
          t={t}
        />

        {/* User email */}
        {!collapsed && user && (
          <div style={{
            padding: '6px 10px', marginBottom: 8,
            borderRadius: 8, background: t.hover,
            border: `1px solid ${t.border}`
          }}>
            <p style={{ fontSize: 10, color: t.sub, margin: '0 0 1px', fontWeight: 500 }}>Signed in as</p>
            <p style={{
              fontSize: 11, color: t.text, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {user.email}
            </p>
          </div>
        )}

        {/* Settings */}
        <NavItem
          to="/settings"
          icon={<FiSettings size={15} />}
          label="Settings"
          active={isActive('/settings')}
          collapsed={collapsed}
          t={t}
        />

        {/* Theme + Sign out */}
        <div style={{
          display: 'flex', gap: 6,
          flexDirection: collapsed ? 'column' : 'row',
          alignItems: 'center', marginTop: 6
        }}>
          <button
            onClick={() => setDark(!dark)}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              flex: collapsed ? 'none' : 1, padding: '7px',
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.hover, color: t.sub, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontSize: 12,
              transition: 'all 0.15s'
            }}
          >
            {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
            {!collapsed && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{
              flex: collapsed ? 'none' : 1, padding: '7px',
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.hover, color: t.danger, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontSize: 12,
              transition: 'all 0.15s'
            }}
          >
            <FiLogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label, active, collapsed, t }) {
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: collapsed ? '9px 0' : '7px 10px',
        borderRadius: 8, cursor: 'pointer', marginBottom: 2,
        background: active ? t.active : 'transparent',
        borderLeft: active ? `2px solid #1D9E75` : '2px solid transparent',
        color: active ? t.text : t.sub,
        fontWeight: active ? 500 : 400,
        justifyContent: collapsed ? 'center' : 'flex-start',
        transition: 'background 0.15s', fontSize: 13,
      }}>
        <span style={{ flexShrink: 0 }}>{icon}</span>
        {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
      </div>
    </Link>
  )
}