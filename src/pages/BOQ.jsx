import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { exportBOQPDF } from '../utils/exportPDF'

const UNITS = ['m²','m³','m','kg','ton','nos','lm','hrs','ls','set']

export default function BOQ() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [projectId])

  async function fetchAll() {
    const { data: proj } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    setProject(proj)

    const { data: secs } = await supabase
      .from('boq_sections')
      .select('*, boq_items(*)')
      .eq('project_id', projectId)
      .order('position')

    // Sort items by created_at within each section
    const sorted = (secs || []).map(s => ({
      ...s,
      boq_items: (s.boq_items || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    }))

    setSections(sorted)
    setLoading(false)
  }

  function fmtMoney(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K'
    return '$' + Math.round(n)
  }

  function itemTotal(it) {
    return (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0)
  }

  function sectionTotal(sec) {
    return (sec.boq_items || []).reduce((s, it) => s + itemTotal(it), 0)
  }

  function sectionPaid(sec) {
    return (sec.boq_items || []).reduce((s, it) => s + (it.is_paid ? itemTotal(it) : 0), 0)
  }

  function grandTotal() {
    return sections.reduce((s, sec) => s + sectionTotal(sec), 0)
  }

  function totalPaid() {
    return sections.reduce((s, sec) => s + sectionPaid(sec), 0)
  }

  async function addSection() {
    const { data, error } = await supabase
      .from('boq_sections')
      .insert([{ project_id: projectId, title: 'New section', position: sections.length }])
      .select()
    if (!error) setSections([...sections, { ...data[0], boq_items: [] }])
  }

  async function updateSectionTitle(secId, title) {
    setSections(sections.map(s => s.id === secId ? { ...s, title } : s))
    await supabase.from('boq_sections').update({ title }).eq('id', secId)
  }

  async function deleteSection(secId) {
    await supabase.from('boq_sections').delete().eq('id', secId)
    setSections(sections.filter(s => s.id !== secId))
  }

  async function addItem(secId) {
    const { data, error } = await supabase
      .from('boq_items')
      .insert([{ section_id: secId, description: '', unit: 'm²', quantity: 0, rate: 0, is_paid: false }])
      .select()
    if (!error) {
      setSections(sections.map(s =>
        s.id === secId ? { ...s, boq_items: [...(s.boq_items || []), data[0]] } : s
      ))
    }
  }

  async function updateItem(secId, itemId, field, value) {
    const parsed = (field === 'quantity' || field === 'rate') ? parseFloat(value) || 0 : value
    setSections(sections.map(s =>
      s.id === secId
        ? { ...s, boq_items: s.boq_items.map(it => it.id === itemId ? { ...it, [field]: parsed } : it) }
        : s
    ))
    await supabase.from('boq_items').update({ [field]: parsed }).eq('id', itemId)
  }

  async function togglePaid(secId, itemId, currentVal) {
    const newVal = !currentVal
    setSections(sections.map(s =>
      s.id === secId
        ? { ...s, boq_items: s.boq_items.map(it => it.id === itemId ? { ...it, is_paid: newVal } : it) }
        : s
    ))
    await supabase.from('boq_items').update({ is_paid: newVal }).eq('id', itemId)
  }

  async function deleteItem(secId, itemId) {
    await supabase.from('boq_items').delete().eq('id', itemId)
    setSections(sections.map(s =>
      s.id === secId ? { ...s, boq_items: s.boq_items.filter(it => it.id !== itemId) } : s
    ))
  }

  async function saveBudgetToProject() {
    setSaving(true)
    const gt = grandTotal()
    const spent = totalPaid()
    await supabase.from('projects').update({ budget: gt, spent }).eq('id', projectId)
    setSaving(false)
    alert('Budget & payments synced to project!')
  }

  const thStyle = {
    fontSize: 11, color: '#888', fontWeight: 500,
    padding: '6px 8px', textAlign: 'left',
    background: '#f5f5f3', borderBottom: '0.5px solid #eee'
  }
  const tdStyle = (isPaid) => ({
    padding: '7px 8px',
    fontSize: 13,
    borderBottom: '0.5px solid #f0f0f0',
    verticalAlign: 'middle',
    background: isPaid ? '#F0FBF5' : '#FEF5F5',
    transition: 'background 0.2s'
  })
  const inputStyle = (isPaid) => ({
    width: '100%', padding: '5px 7px', borderRadius: 6,
    border: `0.5px solid ${isPaid ? '#A8DFC0' : '#F5BDBD'}`,
    fontSize: 12, background: isPaid ? '#F0FBF5' : '#FEF5F5',
    color: '#111', boxSizing: 'border-box'
  })

  const gt = grandTotal()
  const paid = totalPaid()
  const unpaid = gt - paid
  const vatAmt = Math.round(gt * 0.18)
  const paidPct = gt > 0 ? Math.round(paid / gt * 100) : 0

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: '#888' }}>Loading BOQ...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 980, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>
            ← Dashboard
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project?.name} — BOQ</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => exportBOQPDF(project, sections)}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📄 Export PDF
          </button>
          <button
            onClick={saveBudgetToProject}
            disabled={saving}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Sync to project'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total items', value: sections.reduce((s, sec) => s + (sec.boq_items?.length || 0), 0), color: '#111' },
          { label: 'Grand total', value: fmtMoney(gt), color: '#111' },
          { label: 'Paid', value: fmtMoney(paid), color: '#0F6E56' },
          { label: 'Unpaid', value: fmtMoney(unpaid), color: '#A32D2D' },
        ].map((m, i) => (
          <div key={i} style={{ background: '#f5f5f3', borderRadius: 8, padding: '0.875rem 1rem' }}>
            <p style={{ fontSize: 11, color: '#888', margin: '0 0 4px' }}>{m.label}</p>
            <p style={{ fontSize: 20, fontWeight: 500, margin: 0, color: m.color }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Payment progress bar */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '12px 16px', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 }}>
          <span>Payment progress</span>
          <span style={{ fontWeight: 500, color: '#111' }}>{paidPct}% paid</span>
        </div>
        <div style={{ height: 8, background: '#FEF5F5', borderRadius: 4, overflow: 'hidden', border: '0.5px solid #F5BDBD' }}>
          <div style={{
            width: `${paidPct}%`, height: '100%',
            background: 'linear-gradient(90deg, #1D9E75, #2EC78A)',
            borderRadius: 4, transition: 'width 0.3s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 5 }}>
          <span style={{ color: '#0F6E56' }}>✓ Paid: {fmtMoney(paid)}</span>
          <span style={{ color: '#A32D2D' }}>✗ Unpaid: {fmtMoney(unpaid)}</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: '1rem', fontSize: 12, color: '#888', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>Legend:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#FEF5F5', border: '1px solid #F5BDBD' }} />
          <span>Unpaid</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#F0FBF5', border: '1px solid #A8DFC0' }} />
          <span>Paid</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 4, background: '#1D9E75', border: '1px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>
          </div>
          <span>Click checkbox to toggle payment</span>
        </div>
      </div>

      {/* Sections */}
      {sections.map(sec => {
        const secPaid = sectionPaid(sec)
        const secTotal = sectionTotal(sec)
        const secPaidPct = secTotal > 0 ? Math.round(secPaid / secTotal * 100) : 0

        return (
          <div key={sec.id} style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem 1rem', borderBottom: '0.5px solid #eee', background: '#fafafa' }}>
              <input
                value={sec.title}
                onChange={e => updateSectionTitle(sec.id, e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, fontWeight: 500, color: '#111', outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#888', marginRight: 4 }}>
                {secPaidPct}% paid
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111', marginRight: 8 }}>
                {fmtMoney(secTotal)}
              </span>
              <button
                onClick={() => deleteSection(sec.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14, padding: '2px 6px' }}
              >✕</button>
            </div>

            {/* Items table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center' }} title="Click to toggle paid/unpaid">Paid</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Rate ($)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {(sec.boq_items || []).map(it => {
                  const isPaid = !!it.is_paid
                  const total = itemTotal(it)

                  return (
                    <tr key={it.id}>

                      {/* Payment checkbox */}
                      <td style={{ ...tdStyle(isPaid), textAlign: 'center' }}>
                        <div
                          onClick={() => togglePaid(sec.id, it.id, isPaid)}
                          title={isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                          style={{
                            width: 20, height: 20, borderRadius: 5, margin: '0 auto',
                            border: `2px solid ${isPaid ? '#1D9E75' : '#F5BDBD'}`,
                            background: isPaid ? '#1D9E75' : '#fff',
                            cursor: 'pointer', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0
                          }}
                        >
                          {isPaid && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        </div>
                      </td>

                      {/* Description */}
                      <td style={tdStyle(isPaid)}>
                        <input
                          style={inputStyle(isPaid)}
                          value={it.description || ''}
                          placeholder="Item description"
                          onChange={e => updateItem(sec.id, it.id, 'description', e.target.value)}
                        />
                      </td>

                      {/* Unit */}
                      <td style={tdStyle(isPaid)}>
                        <select
                          style={inputStyle(isPaid)}
                          value={it.unit || 'm²'}
                          onChange={e => updateItem(sec.id, it.id, 'unit', e.target.value)}
                        >
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>

                      {/* Qty */}
                      <td style={tdStyle(isPaid)}>
                        <input
                          style={inputStyle(isPaid)}
                          type="number" min="0"
                          value={it.quantity || 0}
                          onChange={e => updateItem(sec.id, it.id, 'quantity', e.target.value)}
                        />
                      </td>

                      {/* Rate */}
                      <td style={tdStyle(isPaid)}>
                        <input
                          style={inputStyle(isPaid)}
                          type="number" min="0"
                          value={it.rate || 0}
                          onChange={e => updateItem(sec.id, it.id, 'rate', e.target.value)}
                        />
                      </td>

                      {/* Amount */}
                      <td style={{ ...tdStyle(isPaid), textAlign: 'right', fontWeight: 500, color: isPaid ? '#0F6E56' : '#A32D2D' }}>
                        {fmtMoney(total)}
                      </td>

                      {/* Status badge */}
                      <td style={{ ...tdStyle(isPaid), textAlign: 'center' }}>
                        <span style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 600,
                          background: isPaid ? '#E1F5EE' : '#FEE2E2',
                          color: isPaid ? '#0F6E56' : '#A32D2D',
                          whiteSpace: 'nowrap'
                        }}>
                          {isPaid ? '✓ Paid' : '✗ Unpaid'}
                        </span>
                      </td>

                      {/* Delete */}
                      <td style={tdStyle(isPaid)}>
                        <button
                          onClick={() => deleteItem(sec.id, it.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 13 }}
                        >✕</button>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>

            <button
              onClick={() => addItem(sec.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              + Add line item
            </button>
          </div>
        )
      })}

      {/* Add section */}
      <button
        onClick={addSection}
        style={{ width: '100%', padding: 10, borderRadius: 12, border: '0.5px dashed #ccc', background: 'none', color: '#888', fontSize: 13, cursor: 'pointer', marginBottom: '1.25rem' }}
      >
        + Add section
      </button>

      {/* Summary */}
      <div style={{ background: '#fff', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '1rem 1.25rem' }}>
        <p style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Cost summary
        </p>

        {sections.map(sec => (
          <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#888', padding: '5px 0', borderBottom: '0.5px solid #f0f0f0' }}>
            <span>{sec.title}</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#0F6E56' }}>Paid: {fmtMoney(sectionPaid(sec))}</span>
              <span style={{ fontWeight: 500, color: '#111' }}>{fmtMoney(sectionTotal(sec))}</span>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: '0.5px solid #eee', marginTop: 4 }}>
          <span style={{ color: '#888' }}>Subtotal</span>
          <span style={{ fontWeight: 500 }}>{fmtMoney(gt)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid #eee', color: '#888' }}>
          <span>VAT (18%)</span>
          <span>{fmtMoney(vatAmt)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid #eee' }}>
          <span style={{ color: '#0F6E56' }}>Total paid</span>
          <span style={{ color: '#0F6E56', fontWeight: 500 }}>{fmtMoney(paid)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '0.5px solid #eee' }}>
          <span style={{ color: '#A32D2D' }}>Total unpaid</span>
          <span style={{ color: '#A32D2D', fontWeight: 500 }}>{fmtMoney(unpaid)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, padding: '10px 0 0', fontWeight: 500 }}>
          <span>Total project cost</span>
          <span style={{ color: '#1D9E75' }}>{fmtMoney(gt + vatAmt)}</span>
        </div>
      </div>
    </div>
  )
}