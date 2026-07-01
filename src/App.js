import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import { FiMenu } from 'react-icons/fi'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import BOQ from './pages/BOQ'
import SiteReport from './pages/SiteReport'
import Team from './pages/Team'
import Gantt from './pages/Gantt'
import Settings from './pages/Settings'
import EditProject from './pages/EditProject'
import Documents from './pages/Documents'
import ClientPortal from './pages/ClientPortal'

function Layout({ children }) {
  const { dark } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: dark ? '#111110' : '#f5f5f3' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />
      )}

      {/* Sidebar */}
      <div className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Mobile header */}
        <div className="mobile-header" style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${dark ? '#2e2e2b' : '#e5e5e3'}`,
          background: dark ? '#1c1c1a' : '#fff',
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'sticky', top: 0, zIndex: 100
        }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: dark ? '#e8e8e6' : '#111', padding: 0 }}>
            <FiMenu />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: dark ? '#e8e8e6' : '#111' }}>🏗️ Construction OS</span>
        </div>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/client/:token" element={<ClientPortal />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><Layout><Projects /></Layout></ProtectedRoute>} />
      <Route path="/projects/:projectId/edit" element={<ProtectedRoute><Layout><EditProject /></Layout></ProtectedRoute>} />
      <Route path="/boq/:projectId" element={<ProtectedRoute><Layout><BOQ /></Layout></ProtectedRoute>} />
      <Route path="/reports/:projectId" element={<ProtectedRoute><Layout><SiteReport /></Layout></ProtectedRoute>} />
      <Route path="/team/:projectId" element={<ProtectedRoute><Layout><Team /></Layout></ProtectedRoute>} />
      <Route path="/gantt/:projectId" element={<ProtectedRoute><Layout><Gantt /></Layout></ProtectedRoute>} />
      <Route path="/documents/:projectId" element={<ProtectedRoute><Layout><Documents /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}