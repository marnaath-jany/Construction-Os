import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FiUpload, FiFile, FiTrash2, FiDownload, FiImage, FiFileText } from 'react-icons/fi'

const CATEGORIES = ['general', 'blueprint', 'permit', 'contract', 'photo', 'report']
const STORAGE_BUCKET_CANDIDATES = [
  process.env.REACT_APP_SUPABASE_STORAGE_BUCKET,
  'documents',
  'project-documents',
  'uploads'
].filter(Boolean)

export default function Documents() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [project, setProject] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('general')
  const [filter, setFilter] = useState('all')
  const [dragOver, setDragOver] = useState(false)

  const t = {
    card: dark ? '#1c1c1a' : '#ffffff',
    border: dark ? '#2e2e2b' : '#e5e5e3',
    text: dark ? '#e8e8e6' : '#111110',
    sub: dark ? '#888784' : '#888784',
    hover: dark ? '#252523' : '#f5f5f3',
    input: dark ? '#252523' : '#f9f9f7',
  }

  useEffect(() => { fetchAll() }, [projectId])

  async function fetchAll() {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single()
    setProject(proj)
    const { data } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function uploadFile(file) {
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${projectId}/${Date.now()}.${ext}`

    let uploadedBucket = null
    let uploadError = null

    for (const bucket of STORAGE_BUCKET_CANDIDATES) {
      const { error } = await supabase.storage.from(bucket).upload(path, file)
      if (!error) {
        uploadedBucket = bucket
        uploadError = null
        break
      }
      if (error.message?.includes('Bucket not found')) {
        uploadError = error
        continue
      }
      uploadError = error
      break
    }

    if (!uploadedBucket) {
      const message = uploadError?.message || 'Unknown upload error'
      alert(
        `Upload failed: ${message}\n\n` +
        'Create a public storage bucket in Supabase (or set REACT_APP_SUPABASE_STORAGE_BUCKET to the correct bucket name).'
      )
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(uploadedBucket).getPublicUrl(path)

    await supabase.from('documents').insert([{
      project_id: projectId,
      user_id: user.id,
      name: file.name,
      file_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
      category,
    }])

    setUploading(false)
    fetchAll()
  }

  async function deleteDoc(doc) {
    if (!window.confirm('Delete this document?')) return
    const path = doc.file_url.split('/').pop()
    let deleted = false

    for (const bucket of STORAGE_BUCKET_CANDIDATES) {
      const { error } = await supabase.storage.from(bucket).remove([path])
      if (!error) {
        deleted = true
        break
      }
    }

    if (!deleted) {
      console.warn('Could not remove document from storage bucket, continuing with DB delete')
    }

    await supabase.from('documents').delete().eq('id', doc.id)
    setDocs(docs.filter(d => d.id !== doc.id))
  }

  function fmtSize(bytes) {
    if (bytes > 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
    if (bytes > 1024) return Math.round(bytes / 1024) + ' KB'
    return bytes + ' B'
  }

  function getFileIcon(type) {
    if (type?.startsWith('image/')) return <FiImage size={20} style={{ color: '#185FA5' }} />
    if (type?.includes('pdf')) return <FiFileText size={20} style={{ color: '#A32D2D' }} />
    return <FiFile size={20} style={{ color: '#854F0B' }} />
  }

  function getCategoryColor(cat) {
    const colors = { blueprint: { bg: '#E6F1FB', color: '#185FA5' }, permit: { bg: '#FAEEDA', color: '#854F0B' }, contract: { bg: '#EEEDFE', color: '#534AB7' }, photo: { bg: '#E1F5EE', color: '#0F6E56' }, report: { bg: '#FCEBEB', color: '#A32D2D' }, general: { bg: '#F1EFE8', color: '#5F5E5A' } }
    return colors[cat] || colors.general
  }

  const filtered = filter === 'all' ? docs : docs.filter(d => d.category === filter)

  if (loading) return <p style={{ fontFamily: 'sans-serif', padding: '2rem', color: t.sub }}>Loading documents...</p>

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 860, margin: '0 auto', padding: '2rem 1rem', color: t.text }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <button onClick={() => navigate('/')} style={{ fontSize: 12, color: t.sub, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}>← Dashboard</button>
          <h1 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>{project?.name} — Documents</h1>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); uploadFile(e.dataTransfer.files[0]) }}
        onClick={() => fileRef.current.click()}
        style={{
          border: `2px dashed ${dragOver ? '#1D9E75' : t.border}`,
          borderRadius: 12, padding: '2rem', textAlign: 'center',
          background: dragOver ? '#E1F5EE' : t.card,
          cursor: 'pointer', marginBottom: '1.25rem',
          transition: 'all 0.2s'
        }}
      >
        <FiUpload size={24} style={{ color: '#1D9E75', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
        <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 4px', color: t.text }}>
          {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p style={{ fontSize: 12, color: t.sub, margin: '0 0 12px' }}>Blueprints, permits, contracts, photos — any file type</p>
        <select
          value={category}
          onChange={e => { e.stopPropagation(); setCategory(e.target.value) }}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text }}
        >
          {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={e => uploadFile(e.target.files[0])} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['all', ...CATEGORIES].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `0.5px solid ${filter === f ? '#1D9E75' : t.border}`, background: filter === f ? '#E1F5EE' : t.card, color: filter === f ? '#0F6E56' : t.sub, fontWeight: filter === f ? 500 : 400, textTransform: 'capitalize' }}>
            {f} {f === 'all' ? `(${docs.length})` : `(${docs.filter(d => d.category === f).length})`}
          </button>
        ))}
      </div>

      {/* Documents grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', border: `1px dashed ${t.border}`, borderRadius: 12, color: t.sub }}>
          <FiFile size={32} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
          <p>No documents yet — upload your first file above</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {filtered.map(doc => {
            const cc = getCategoryColor(doc.category)
            const isImage = doc.file_type?.startsWith('image/')
            return (
              <div key={doc.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                {isImage ? (
                  <img src={doc.file_url} alt={doc.name} style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 80, background: t.hover, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {getFileIcon(doc.file_type)}
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 4px', color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: cc.bg, color: cc.color, fontWeight: 500, textTransform: 'capitalize' }}>{doc.category}</span>
                    <span style={{ fontSize: 10, color: t.sub }}>{fmtSize(doc.file_size)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ flex: 1, textDecoration: 'none' }}>
                      <button style={{ width: '100%', padding: '5px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.hover, color: t.sub, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <FiDownload size={11} /> Download
                      </button>
                    </a>
                    <button onClick={() => deleteDoc(doc)} style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid #F5BDBD`, background: '#FEF5F5', color: '#A32D2D', fontSize: 11, cursor: 'pointer' }}>
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}