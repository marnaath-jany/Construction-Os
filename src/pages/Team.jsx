import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useTheme } from '../context/ThemeContext'
import { exportPayrollPDF } from '../utils/exportPDF'
import { FiDollarSign, FiUsers, FiCheckCircle, FiClock, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'

export default function Team() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { dark } = useTheme()
  const [project, setProject] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [expandedMember, setExpandedMember] = useState(null)
  const [form, setForm] = useState({
    name: '', role: '', status: 'active',
    base_salary: '', pay_frequency: 'monthly',
    pay_status: 'unpaid', expected_days: 22, attended_days: 0
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

  useEffect(() => { fetchAll() }, [projectId])

  async function fetchAll() {
    const { data: proj } = await supabase
      .from('projects').select('*').eq('id', projectId).single()
    setProject(proj)
    const { data: team } = await supabase
      .from('team_members').select('*')
      .eq('project_id', projectId)
      .order('created_at')
    setMembers(team || [])
    setLoading(false)
  }

  // Calculate actual salary based on attendance
  function calcActualSalary(member) {
    const base = parseFloat(member.base_salary) || 0
    const expected = parseInt(member.expected_days) || 22
    const attended = parseInt(member.attended_days) || 0
    if (expected === 0) return base
    const attendance = Math.min(attended / expected, 1)
    return Math.round(base * attendance)
  }

  function calcAttendancePct(member) {
    const expected = parseInt(member.expected_days) || 22
    const attended = parseInt(member.attended_days) || 0
    if (expected === 0) return 0
    return Math.min(Math.round((attended / expected) * 100), 100)
  }

  function getAttendanceColor(pct) {
    if (pct >= 90) return { color: '#0F6E56', bg: '#E1F5EE', label: 'Excellent' }
    if (pct >= 75) return { color: '#185FA5', bg: '#E6F1FB', label: 'Good' }
    if (pct >= 50) return { color: '#854F0B', bg: '#FAEEDA', label: 'Average' }
    return { color: '#A32D2D', bg: '#FCEBEB', label: 'Poor' }
  }

  function getDeduction(member) {
    const base = parseFloat(member.base_salary) || 0
    const actual = calcActualSalary(member)
    return base - actual
  }

  function resetForm() {
    setForm({ name: '', role: '', status: 'active', base_salary: '', pay_frequency: 'monthly', pay_status: 'unpaid', expected_days: 22, attended_days: 0 })
    setEditMember(null)
    setShowForm(false)
  }

  function openEdit(member) {
    setForm({
      name: member.name,
      role: member.role || '',
      status: member.status || 'active',
      base_salary: member.base_salary || '',
      pay_frequency: member.pay_frequency || 'monthly',
      pay_status: member.pay_status || 'unpaid',
      expected_days: member.expected_days || 22,
      attended_days: member.attended_days || 0
    })
    setEditMember(member.id)
    setShowForm(true)
  }

  async function saveMember() {
    if (!form.name) { alert('Name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name,
      role: form.role,
      status: form.status,
      base_salary: parseFloat(form.base_salary) || 0,
      salary: calcActualSalary({ ...form, base_salary: form.base_salary }),
      pay_frequency: form.pay_frequency,
      pay_status: form.pay_status,
      expected_days: parseInt(form.expected_days) || 22,
      attended_days: parseInt(form.attended_days) || 0,
    }
    if (editMember) {
      await supabase.from('team_members').update(payload).eq('id', editMember)
      setMembers(members.map(m => m.id === editMember ? { ...m, ...payload } : m))
    } else {
      const { data, error } = await supabase.from('team_members')
        .insert([{ ...payload, project_id: projectId }]).select()
      if (!error && data) setMembers([...members, data[0]])
    }
    setSaving(false)
    resetForm()
  }

  async function updateAttendance(id, field, value) {
    const member = members.find(m => m.id === id)
    const updated = { ...member, [field]: parseInt(value) || 0 }
    const actualSalary = calcActualSalary(updated)
    await supabase.from('team_members').update({ [field]: parseInt(value) || 0, salary: actualSalary }).eq('id', id)
    setMembers(members.map(m => m.id === id ? { ...m, [field]: parseInt(value) || 0, salary: actualSalary } : m))
  }

  async function togglePayStatus(member) {
    const newStatus = member.pay_status === 'paid' ? 'unpaid' : 'paid'
    await supabase.from('team_members').update({ pay_status: newStatus }).eq('id', member.id)
    setMembers(members.map(m => m.id === member.id ? { ...m, pay_status: newStatus } : m))
  }

  async function updateStatus(id, status) {
    await supabase.from('team_members').update({ status }).eq('id', id)
    setMembers(members.map(m => m.id === id ? { ...m, status } : m))
  }

  async function deleteMember(id) {
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(members.filter(m => m.id !== id))
  }

  function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  function fmtMoney(n) {
    const num = parseFloat(n) || 0
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return '$' + Math.round(num / 1000) + 'K'
    return '$' + Math.round(num)
  }

  const avatarColors = [
    { bg: '#E6F1FB', color: '#185FA5' },
    { bg: '#E1F5EE', color: '#0F6E56' },
    { bg: '#EEEDFE', color: '#534AB7' },
    { bg: '#FAEEDA', color: '#854F0B' },
    { bg: '#FAECE7', color: '#993C1D' },
    { bg: '#EAF3DE', color: '#3B6D11' },
  ]

  const statusColors = {
    active:     { bg: '#E1F5EE', color: '#0F6E56', label: 'On site' },
    'off duty': { bg: '#F1EFE8', color: '#5F5E5A', label: 'Off duty' },
    delayed:    { bg: '#FCEBEB', color: '#A32D2D', label: 'Delayed' },
    overtime:   { bg: '#FAEEDA', color: '#854F0B', label: 'Overtime' },
  }

  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${t.inputBorder}`, fontSize: 13,
    background: t.input, color: t.text,
    boxSizing: 'border-box', outline: 'none'
  }
  const labelStyle = { fontSize: 12, color: t.sub, display: 'block', marginBottom: 12 }

  const totalBaseSalary = members.reduce((s, m) => s + (parseFloat(m.base_salary) || 0), 0)
  const totalActualSalary = members.reduce((s, m) => s + calcActualSalary(m), 0)
  const totalDeductions = totalBaseSalary - totalActualSalary
  const totalPaid = members.filter(m => m.pay_status === 'paid').reduce((s, m) => s + calcActualSalary(m), 0)
  const totalUnpaid = totalActualSalary - totalPaid
  const avgAttendance = members.length > 0
    ? Math.round(members.reduce((s, m) => s + calcAttendancePct(m), 0) / members.length)
    : 0

  // Live preview of actual salary in form
  const formActualSalary = calcActualSalary({
    base_salary: form.base_salary,
    expected_days: form.expected_days,
    attended_days: form.attended_days
  })
  const formDeduction = (parseFloat(form.base_salary) || 0) - formActualSalary

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: t.sub }}>Loading team...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 960, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>← Dashboard</button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project?.name} — Team & Payroll</h1>
          <p style={{ fontSize: 12, color: t.sub, margin: '3px 0 0' }}>Salary is automatically reduced based on attendance</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => exportPayrollPDF(project, members)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            📄 Export Payroll PDF
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total members', value: members.length, color: t.text, icon: <FiUsers size={13} /> },
          { label: 'Avg attendance', value: `${avgAttendance}%`, color: avgAttendance >= 75 ? '#0F6E56' : '#A32D2D', icon: <FiTrendingUp size={13} /> },
          { label: 'Base payroll', value: fmtMoney(totalBaseSalary), color: t.text, icon: <FiDollarSign size={13} /> },
          { label: 'Total deductions', value: `-${fmtMoney(totalDeductions)}`, color: '#A32D2D', icon: <FiTrendingDown size={13} /> },
          { label: 'Actual payroll', value: fmtMoney(totalActualSalary), color: '#0F6E56', icon: <FiDollarSign size={13} /> },
          { label: 'Unpaid', value: fmtMoney(totalUnpaid), color: '#A32D2D', icon: <FiClock size={13} /> },
        ].map((m, i) => (
          <div key={i} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: '0.875rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, color: t.sub }}>
              {m.icon}
              <p style={{ fontSize: 11, color: t.sub, margin: 0 }}>{m.label}</p>
            </div>
            <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Payroll progress bar */}
      {totalActualSalary > 0 && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.sub, marginBottom: 6 }}>
            <span>Payroll progress</span>
            <span style={{ fontWeight: 500, color: t.text }}>{fmtMoney(totalPaid)} of {fmtMoney(totalActualSalary)} paid</span>
          </div>
          <div style={{ height: 8, background: dark ? '#2e2e2b' : '#FEF5F5', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${totalActualSalary > 0 ? Math.round(totalPaid / totalActualSalary * 100) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #1D9E75, #2EC78A)', borderRadius: 4, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.sub, marginTop: 5 }}>
            <span style={{ color: '#0F6E56' }}>✓ Paid: {fmtMoney(totalPaid)}</span>
            <span style={{ color: '#A32D2D' }}>✗ Unpaid: {fmtMoney(totalUnpaid)}</span>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem', color: t.text }}>
            {editMember ? 'Edit member' : 'Add team member'}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>Full name *
              <input style={inputStyle} value={form.name} placeholder="e.g. Alain Kagabo" onChange={e => setForm({ ...form, name: e.target.value })} />
            </label>
            <label style={labelStyle}>Role / Position
              <input style={inputStyle} value={form.role} placeholder="e.g. Site Engineer" onChange={e => setForm({ ...form, role: e.target.value })} />
            </label>
          </div>

          {/* Salary & Attendance */}
          <div style={{ background: t.hover, borderRadius: 10, padding: '1rem', marginBottom: 14, border: `1px solid ${t.border}` }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: t.sub, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💰 Salary & Attendance
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={labelStyle}>Base salary ($)
                <input style={inputStyle} type="number" min="0" value={form.base_salary} placeholder="0" onChange={e => setForm({ ...form, base_salary: e.target.value })} />
              </label>
              <label style={labelStyle}>Pay frequency
                <select style={inputStyle} value={form.pay_frequency} onChange={e => setForm({ ...form, pay_frequency: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label style={labelStyle}>Expected days (this period)
                <input style={inputStyle} type="number" min="1" max="31" value={form.expected_days} onChange={e => setForm({ ...form, expected_days: e.target.value })} />
              </label>
              <label style={labelStyle}>Days attended
                <input style={inputStyle} type="number" min="0" max={form.expected_days} value={form.attended_days} onChange={e => setForm({ ...form, attended_days: e.target.value })} />
              </label>
            </div>

            {/* Live salary preview */}
            {form.base_salary > 0 && (
              <div style={{ background: t.card, borderRadius: 8, padding: '10px 14px', border: `1px solid ${t.border}` }}>
                <p style={{ fontSize: 11, color: t.sub, margin: '0 0 8px', fontWeight: 500 }}>Live salary preview</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <p style={{ fontSize: 10, color: t.sub, margin: '0 0 2px' }}>Base salary</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>{fmtMoney(form.base_salary)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#A32D2D', margin: '0 0 2px' }}>Deduction</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#A32D2D' }}>-{fmtMoney(formDeduction)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: '#0F6E56', margin: '0 0 2px' }}>Actual pay</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0F6E56' }}>{fmtMoney(formActualSalary)}</p>
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.sub, marginBottom: 3 }}>
                    <span>Attendance</span>
                    <span>{Math.min(Math.round((parseInt(form.attended_days) || 0) / (parseInt(form.expected_days) || 22) * 100), 100)}%</span>
                  </div>
                  <div style={{ height: 5, background: t.border, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(Math.round((parseInt(form.attended_days) || 0) / (parseInt(form.expected_days) || 22) * 100), 100)}%`,
                      height: '100%', background: '#1D9E75', borderRadius: 3
                    }} />
                  </div>
                </div>
              </div>
            )}

            {/* Payment status */}
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 12, color: t.sub, margin: '0 0 8px' }}>Payment status</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {['unpaid', 'paid'].map(s => (
                  <div
                    key={s}
                    onClick={() => setForm({ ...form, pay_status: s })}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${form.pay_status === s ? (s === 'paid' ? '#1D9E75' : '#D85A30') : t.border}`,
                      background: form.pay_status === s ? (s === 'paid' ? '#E1F5EE' : '#FEF5F5') : t.hover,
                      color: form.pay_status === s ? (s === 'paid' ? '#0F6E56' : '#A32D2D') : t.sub,
                      fontSize: 13, fontWeight: form.pay_status === s ? 600 : 400, transition: 'all 0.15s'
                    }}
                  >
                    {s === 'paid' ? '✓ Paid' : '✗ Unpaid'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <label style={labelStyle}>Work status
            <select style={inputStyle} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="active">On site</option>
              <option value="off duty">Off duty</option>
              <option value="overtime">Overtime</option>
              <option value="delayed">Delayed</option>
            </select>
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveMember} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontWeight: 500, fontSize: 14, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editMember ? 'Update member' : 'Add member'}
            </button>
            <button onClick={resetForm} style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.hover, color: t.sub, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team list */}
      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: `1px dashed ${t.border}`, borderRadius: 12, color: t.sub }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No team members yet</p>
          <p style={{ fontSize: 13 }}>Add your first member to track attendance and salary</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map((m, i) => {
            const ac = avatarColors[i % avatarColors.length]
            const sc = statusColors[m.status] || statusColors['active']
            const isPaid = m.pay_status === 'paid'
            const pct = calcAttendancePct(m)
            const ac2 = getAttendanceColor(pct)
            const actualSalary = calcActualSalary(m)
            const deduction = getDeduction(m)
            const isExpanded = expandedMember === m.id

            return (
              <div key={m.id} style={{ background: t.card, border: `1px solid ${isPaid ? '#A8DFC0' : t.border}`, borderRadius: 12, overflow: 'hidden', transition: 'all 0.2s' }}>

                {/* Main row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', gap: 8, padding: '12px 16px', alignItems: 'center', background: isPaid ? (dark ? '#0f1f19' : '#F8FDF9') : t.card }}>

                  {/* Member info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: ac.bg, color: ac.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                      {getInitials(m.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 3px', color: t.text }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: t.sub, margin: '0 0 3px' }}>{m.role || 'No role'}</p>
                      <select
                        value={m.status}
                        onChange={e => updateStatus(m.id, e.target.value)}
                        style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, border: 'none', background: sc.bg, color: sc.color, fontWeight: 500, cursor: 'pointer' }}
                      >
                        <option value="active">On site</option>
                        <option value="off duty">Off duty</option>
                        <option value="overtime">Overtime</option>
                        <option value="delayed">Delayed</option>
                      </select>
                    </div>
                  </div>

                  {/* Attendance */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.sub, marginBottom: 3 }}>
                      <span>{m.attended_days || 0}/{m.expected_days || 22} days</span>
                      <span style={{ color: ac2.color, fontWeight: 600 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: t.border, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: ac2.color, borderRadius: 3, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: ac2.bg, color: ac2.color, fontWeight: 500, marginTop: 3, display: 'inline-block' }}>
                      {ac2.label}
                    </span>
                  </div>

                  {/* Base salary */}
                  <div>
                    <p style={{ fontSize: 10, color: t.sub, margin: '0 0 2px' }}>Base</p>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: t.text }}>{fmtMoney(m.base_salary)}</p>
                    {deduction > 0 && (
                      <p style={{ fontSize: 10, color: '#A32D2D', margin: '1px 0 0' }}>-{fmtMoney(deduction)} deducted</p>
                    )}
                  </div>

                  {/* Actual salary */}
                  <div>
                    <p style={{ fontSize: 10, color: t.sub, margin: '0 0 2px' }}>Actual pay</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#0F6E56' }}>{fmtMoney(actualSalary)}</p>
                    <p style={{ fontSize: 10, color: t.sub, margin: '1px 0 0', textTransform: 'capitalize' }}>{m.pay_frequency || 'monthly'}</p>
                  </div>

                  {/* Pay status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      onClick={() => togglePayStatus(m)}
                      title={isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                      style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${isPaid ? '#1D9E75' : '#F5BDBD'}`, background: isPaid ? '#1D9E75' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
                    >
                      {isPaid && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: isPaid ? '#E1F5EE' : '#FEF5F5', color: isPaid ? '#0F6E56' : '#A32D2D' }}>
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      onClick={() => setExpandedMember(isExpanded ? null : m.id)}
                      style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: t.sub }}
                      title="View analytics"
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      style={{ background: t.hover, border: `1px solid ${t.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: t.sub }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMember(m.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14, padding: '4px 6px' }}
                    >✕</button>
                  </div>
                </div>

                {/* Quick attendance editor */}
                <div style={{ padding: '0 16px 12px', display: 'flex', gap: 12, alignItems: 'center', borderTop: `1px solid ${t.border}`, paddingTop: 10 }}>
                  <span style={{ fontSize: 11, color: t.sub, whiteSpace: 'nowrap' }}>Quick update:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: t.sub }}>Days attended</span>
                    <input
                      type="number" min="0" max={m.expected_days || 22}
                      value={m.attended_days || 0}
                      onChange={e => updateAttendance(m.id, 'attended_days', e.target.value)}
                      style={{ width: 60, padding: '3px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontSize: 12, background: t.input, color: t.text, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 11, color: t.sub }}>of</span>
                    <input
                      type="number" min="1" max="31"
                      value={m.expected_days || 22}
                      onChange={e => updateAttendance(m.id, 'expected_days', e.target.value)}
                      style={{ width: 60, padding: '3px 6px', borderRadius: 6, border: `1px solid ${t.border}`, fontSize: 12, background: t.input, color: t.text, textAlign: 'center' }}
                    />
                    <span style={{ fontSize: 11, color: t.sub }}>expected</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#0F6E56', fontWeight: 500, marginLeft: 'auto' }}>
                    → Actual pay: <strong>{fmtMoney(actualSalary)}</strong>
                  </span>
                </div>

                {/* Expanded analytics */}
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${t.border}`, padding: '14px 16px', background: t.hover }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: t.sub, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      📊 Salary analytics
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                      {[
                        { label: 'Base salary', value: fmtMoney(m.base_salary), color: t.text },
                        { label: 'Daily rate', value: fmtMoney((parseFloat(m.base_salary) || 0) / (parseInt(m.expected_days) || 22)), color: t.text },
                        { label: 'Days attended', value: `${m.attended_days || 0} days`, color: '#185FA5' },
                        { label: 'Days missed', value: `${Math.max(0, (parseInt(m.expected_days) || 22) - (parseInt(m.attended_days) || 0))} days`, color: '#A32D2D' },
                        { label: 'Deduction', value: `-${fmtMoney(deduction)}`, color: '#A32D2D' },
                        { label: 'Actual pay', value: fmtMoney(actualSalary), color: '#0F6E56' },
                      ].map((stat, si) => (
                        <div key={si} style={{ background: t.card, borderRadius: 8, padding: '10px 12px', border: `1px solid ${t.border}` }}>
                          <p style={{ fontSize: 10, color: t.sub, margin: '0 0 4px' }}>{stat.label}</p>
                          <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: stat.color }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Visual attendance breakdown */}
                    <div style={{ background: t.card, borderRadius: 8, padding: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: 11, color: t.sub, margin: '0 0 8px' }}>Attendance breakdown</p>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        {Array.from({ length: parseInt(m.expected_days) || 22 }).map((_, di) => {
                          const attended = di < (parseInt(m.attended_days) || 0)
                          return (
                            <div
                              key={di}
                              title={attended ? `Day ${di + 1}: Present` : `Day ${di + 1}: Absent`}
                              style={{
                                width: 18, height: 18, borderRadius: 4,
                                background: attended ? '#1D9E75' : (dark ? '#2e2e2b' : '#f0f0ee'),
                                border: `1px solid ${attended ? '#1D9E75' : t.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 8, color: attended ? '#fff' : t.sub,
                                cursor: 'default'
                              }}
                            >
                              {di + 1}
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: t.sub }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75' }} /> Present ({m.attended_days || 0})
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: dark ? '#2e2e2b' : '#f0f0ee', border: `1px solid ${t.border}` }} /> Absent ({Math.max(0, (parseInt(m.expected_days) || 22) - (parseInt(m.attended_days) || 0))})
                        </span>
                      </div>
                    </div>

                    {/* Salary breakdown bar */}
                    <div style={{ marginTop: 10, background: t.card, borderRadius: 8, padding: '12px', border: `1px solid ${t.border}` }}>
                      <p style={{ fontSize: 11, color: t.sub, margin: '0 0 8px' }}>Salary breakdown</p>
                      <div style={{ display: 'flex', height: 20, borderRadius: 5, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                        <div style={{ width: `${pct}%`, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {pct > 15 && <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{fmtMoney(actualSalary)}</span>}
                        </div>
                        <div style={{ flex: 1, background: '#FEF5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(100 - pct) > 15 && <span style={{ fontSize: 10, color: '#A32D2D', fontWeight: 600 }}>-{fmtMoney(deduction)}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: t.sub, marginTop: 4 }}>
                        <span style={{ color: '#0F6E56' }}>✓ Earned {pct}%</span>
                        <span style={{ color: '#A32D2D' }}>✗ Deducted {100 - pct}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Summary row */}
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', gap: 8, alignItems: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: t.text }}>Total ({members.length} members)</p>
              <p style={{ fontSize: 12, color: t.sub, margin: 0 }}>Avg {avgAttendance}%</p>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: t.text }}>{fmtMoney(totalBaseSalary)}</p>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: '#0F6E56' }}>{fmtMoney(totalActualSalary)}</p>
                <p style={{ fontSize: 10, color: '#A32D2D', margin: '2px 0 0' }}>-{fmtMoney(totalDeductions)} deducted</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#0F6E56', margin: '0 0 2px', fontWeight: 500 }}>✓ {fmtMoney(totalPaid)} paid</p>
                <p style={{ fontSize: 11, color: '#A32D2D', margin: 0, fontWeight: 500 }}>✗ {fmtMoney(totalUnpaid)} unpaid</p>
              </div>
              <p style={{ margin: 0 }}></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}