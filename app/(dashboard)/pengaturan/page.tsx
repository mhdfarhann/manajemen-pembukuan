'use client'
// app/(dashboard)/pengaturan/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah } from '@/lib/harga'
import {
  Plus, Trash2, Pencil, Check, X, Building2,
  Hash, Layers, Tag,
  DollarSign, AlertCircle, PackagePlus,
  ImageIcon
} from 'lucide-react'

type Kamar    = Database['public']['Tables']['kamar']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']

type Tab = 'kamar' | 'harga' | 'media'

// ─── Helper: ambil tenant_id user yang sedang login ───────────
async function getTenantId(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_my_tenant_id')
  if (error) console.error('getTenantId error:', error)
  return data ?? null
}

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<Tab>('kamar')

  return (
    <div style={{ padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
          Pengaturan
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
          Kelola data kamar dan harga sewa per lantai
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: 4,
        width: 'fit-content', marginBottom: 24,
      }}>
        {([
          { key: 'kamar', label: 'Manajemen Kamar', icon: Building2 },
          { key: 'harga', label: 'Harga Sewa',       icon: DollarSign },
          { key: 'media', label: 'Branding & Media', icon: ImageIcon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 7, border: 'none',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === key ? 500 : 400,
              transition: 'all 0.15s',
              background: activeTab === key ? 'var(--bg)' : 'transparent',
              color: activeTab === key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Icon size={14} strokeWidth={activeTab === key ? 2 : 1.7} />
            {label}
          </button>
        ))}
      </div>

      {/* ✅ Fix: render hanya tab yang aktif */}
      {activeTab === 'kamar' && <TabKamar />}
      {activeTab === 'harga' && <TabHarga />}
      {activeTab === 'media' && <TabMedia />}

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: MANAJEMEN KAMAR
// ═══════════════════════════════════════════════════════════════
function TabKamar() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [kamarList,    setKamarList]   = useState<Kamar[]>([])
  const [loading,      setLoading]     = useState(true)
  const [saving,       setSaving]      = useState(false)
  const [error,        setError]       = useState('')
  const [success,      setSuccess]     = useState('')
  const [tenantId,     setTenantId]    = useState<string>('')   // ✅ tambah state

  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Kamar>>({})

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ nomor_kamar: '', lantai: 1, tipe: 'standard', catatan: '' })

  const [showBatch,   setShowBatch]   = useState(false)
  const [batchLantai, setBatchLantai] = useState(1)
  const [batchDari,   setBatchDari]   = useState(1)
  const [batchSampai, setBatchSampai] = useState(10)
  const [batchPrefix, setBatchPrefix] = useState('')
  const [batchTipe,   setBatchTipe]   = useState('standard')

  const [filterLantai, setFilterLantai] = useState<number | ''>('')

  // ✅ Fetch tenant_id saat mount
  useEffect(() => {
    getTenantId(supabase).then(tid => { if (tid) setTenantId(tid) })
  }, [supabase])

  const fetchKamar = useCallback(async () => {
    const { data } = await supabase.from('kamar').select('*').order('lantai').order('nomor_kamar')
    if (data) setKamarList(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchKamar() }, [fetchKamar])

  function flash(msg: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else                    { setError(msg);   setTimeout(() => setError(''), 4000) }
  }

  // ── Tambah satu kamar ──────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) { flash('Session tidak valid, coba refresh halaman.', 'error'); return }
    setSaving(true)
    setError('')

    const nomor = addForm.nomor_kamar.trim().toUpperCase()
    if (!nomor) { flash('Nomor kamar wajib diisi.', 'error'); setSaving(false); return }

    const exists = kamarList.some(k => k.nomor_kamar === nomor)
    if (exists) { flash(`Kamar ${nomor} sudah ada.`, 'error'); setSaving(false); return }

    const { error: err } = await supabase.from('kamar').insert({
      nomor_kamar: nomor,
      lantai:      addForm.lantai,
      tipe:        addForm.tipe,
      catatan:     addForm.catatan || null,
      tenant_id:   tenantId,   // ✅ wajib ada
    })

    if (err) flash(err.message, 'error')
    else {
      flash(`Kamar ${nomor} berhasil ditambahkan.`)
      setAddForm({ nomor_kamar: '', lantai: addForm.lantai, tipe: 'standard', catatan: '' })
      setShowAddForm(false)
      fetchKamar()
    }
    setSaving(false)
  }

  // ── Tambah batch ───────────────────────────────────────────
  async function handleBatch() {
    if (!tenantId) { flash('Session tidak valid, coba refresh halaman.', 'error'); return }
    if (batchDari > batchSampai) { flash('Angka awal harus ≤ angka akhir.', 'error'); return }
    if (batchSampai - batchDari > 49) { flash('Maksimal 50 kamar sekaligus.', 'error'); return }

    setSaving(true)
    const prefix = batchPrefix.trim().toUpperCase()

    const newKamar = []
    for (let i = batchDari; i <= batchSampai; i++) {
      const nomor = prefix
        ? `${prefix}${batchLantai}${String(i).padStart(2, '0')}`
        : `${batchLantai}${String(i).padStart(2, '0')}`
      if (!kamarList.some(k => k.nomor_kamar === nomor)) {
        newKamar.push({
          nomor_kamar: nomor,
          lantai:      batchLantai,
          tipe:        batchTipe,
          tenant_id:   tenantId,   // ✅ wajib ada
        })
      }
    }

    if (newKamar.length === 0) { flash('Semua nomor kamar sudah ada.', 'error'); setSaving(false); return }

    const { error: err } = await supabase.from('kamar').insert(newKamar)
    if (err) flash(err.message, 'error')
    else {
      flash(`${newKamar.length} kamar berhasil ditambahkan ke lantai ${batchLantai}.`)
      setShowBatch(false)
      fetchKamar()
    }
    setSaving(false)
  }

  // ── Edit inline ────────────────────────────────────────────
  function startEdit(kamar: Kamar) {
    setEditId(kamar.id)
    setEditForm({ nomor_kamar: kamar.nomor_kamar, lantai: kamar.lantai, tipe: kamar.tipe, catatan: kamar.catatan || '' })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const { error: err } = await supabase
      .from('kamar').update({
        nomor_kamar: String(editForm.nomor_kamar).toUpperCase().trim(),
        lantai:      editForm.lantai,
        tipe:        editForm.tipe,
        catatan:     editForm.catatan || null,
      }).eq('id', id)
    if (err) flash(err.message, 'error')
    else { flash('Kamar diperbarui.'); setEditId(null); fetchKamar() }
    setSaving(false)
  }

  // ── Hapus ──────────────────────────────────────────────────
  async function handleDelete(kamar: Kamar) {
    if (kamar.status === 'terisi') {
      flash('Kamar sedang terisi, tidak bisa dihapus.', 'error')
      return
    }
    if (!confirm(`Hapus kamar ${kamar.nomor_kamar}?\nTindakan ini tidak bisa dibatalkan.`)) return
    const { error: err } = await supabase.from('kamar').delete().eq('id', kamar.id)
    if (err) flash(err.message, 'error')
    else { flash(`Kamar ${kamar.nomor_kamar} dihapus.`); fetchKamar() }
  }

  const lantaiList = [...new Set(kamarList.map(k => k.lantai))].sort()
  const filtered   = filterLantai === '' ? kamarList : kamarList.filter(k => k.lantai === filterLantai)

  const batchPreview = (() => {
    const prefix = batchPrefix.trim().toUpperCase()
    const arr = []
    for (let i = batchDari; i <= Math.min(batchSampai, batchDari + 4); i++) {
      arr.push(prefix
        ? `${prefix}${batchLantai}${String(i).padStart(2, '0')}`
        : `${batchLantai}${String(i).padStart(2, '0')}`)
    }
    if (batchSampai - batchDari > 4) arr.push('...')
    return arr
  })()

  return (
    <div>
      {(success || error) && (
        <div style={{
          background: success ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${success ? 'var(--green-border)' : 'var(--red-border)'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: success ? 'var(--green)' : 'var(--red)',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success ? <Check size={14} /> : <AlertCircle size={14} />}
          {success || error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={filterLantai}
          onChange={e => setFilterLantai(e.target.value === '' ? '' : Number(e.target.value))}
          style={{ width: 140 }}
        >
          <option value="">Semua Lantai</option>
          {lantaiList.map(l => <option key={l} value={l}>Lantai {l}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => { setShowBatch(v => !v); setShowAddForm(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <PackagePlus size={14} />
            Tambah Batch
          </button>
          <button
            className="btn-primary"
            onClick={() => { setShowAddForm(v => !v); setShowBatch(false) }}
            style={{ display: 'flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Tambah Kamar
          </button>
        </div>
      </div>

      {/* ── Form tambah single ─────────────────────────────── */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent-mid)', background: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Tambah Kamar Baru</span>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="field-label">Nomor Kamar *</label>
                <input
                  placeholder="cth: 101, A201"
                  value={addForm.nomor_kamar}
                  onChange={e => setAddForm({ ...addForm, nomor_kamar: e.target.value.toUpperCase() })}
                  required
                  style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div>
                <label className="field-label">Lantai *</label>
                <input
                  type="number" min={1} max={99}
                  value={addForm.lantai}
                  onChange={e => setAddForm({ ...addForm, lantai: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="field-label">Tipe</label>
                <select value={addForm.tipe} onChange={e => setAddForm({ ...addForm, tipe: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="field-label">Catatan</label>
              <input
                placeholder="Catatan tambahan (opsional)"
                value={addForm.catatan}
                onChange={e => setAddForm({ ...addForm, catatan: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Batal</button>
              <button type="submit" className="btn-primary" disabled={saving || !tenantId}>
                {saving ? <><span className="loader" style={{ width: 13, height: 13 }} /> Menyimpan...</> : <><Check size={13} /> Simpan Kamar</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Form tambah batch ─────────────────────────────── */}
      {showBatch && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#c4b5fd', background: '#faf5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PackagePlus size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>Tambah Kamar Sekaligus (Batch)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="field-label"><Layers size={10} style={{ display: 'inline', marginRight: 3 }} />Lantai</label>
              <input type="number" min={1} max={99} value={batchLantai} onChange={e => setBatchLantai(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label"><Hash size={10} style={{ display: 'inline', marginRight: 3 }} />Nomor Dari</label>
              <input type="number" min={1} value={batchDari} onChange={e => setBatchDari(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label"><Hash size={10} style={{ display: 'inline', marginRight: 3 }} />Nomor Sampai</label>
              <input type="number" min={1} value={batchSampai} onChange={e => setBatchSampai(Number(e.target.value))} />
            </div>
            <div>
              <label className="field-label"><Tag size={10} style={{ display: 'inline', marginRight: 3 }} />Prefix (opsional)</label>
              <input
                placeholder="cth: A, B, VIP"
                value={batchPrefix}
                onChange={e => setBatchPrefix(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="field-label">Tipe Kamar</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['standard', 'deluxe', 'suite', 'vip'].map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setBatchTipe(t)}
                  style={{
                    padding: '6px 14px', borderRadius: 7, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, fontWeight: batchTipe === t ? 500 : 400,
                    textTransform: 'capitalize',
                    background: batchTipe === t ? '#ede9fe' : 'var(--bg)',
                    borderColor: batchTipe === t ? '#7c3aed' : 'var(--border)',
                    color: batchTipe === t ? '#7c3aed' : 'var(--text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.06em' }}>
              PREVIEW NOMOR KAMAR — {batchSampai - batchDari + 1} kamar
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {batchPreview.map((n, i) => (
                <span key={i} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '3px 10px',
                  fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)',
                }}>
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary" onClick={() => setShowBatch(false)}>Batal</button>
            <button
              className="btn-primary"
              onClick={handleBatch}
              disabled={saving || !tenantId}
              style={{ background: '#7c3aed' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#6d28d9')}
              onMouseLeave={e => (e.currentTarget.style.background = '#7c3aed')}
            >
              {saving
                ? <><span className="loader" style={{ width: 13, height: 13 }} /> Menambahkan...</>
                : <><PackagePlus size={13} /> Tambah {batchSampai - batchDari + 1} Kamar</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Tabel kamar ───────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {!loading && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {lantaiList.map(l => {
              const total  = kamarList.filter(k => k.lantai === l).length
              const kosong = kamarList.filter(k => k.lantai === l && k.status === 'kosong').length
              return (
                <button
                  key={l}
                  onClick={() => setFilterLantai(filterLantai === l ? '' : l)}
                  style={{
                    flex: '0 0 auto', padding: '10px 20px',
                    border: 'none', borderRight: '1px solid var(--border)',
                    background: filterLantai === l ? 'var(--accent-light)' : 'var(--bg-secondary)',
                    cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: filterLantai === l ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>
                    LANTAI {l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {total} kamar · <span style={{ color: 'var(--green)' }}>{kosong} kosong</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
            <div className="loader" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data kamar...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏨</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 6 }}>Belum ada data kamar.</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Klik <strong>Tambah Kamar</strong> atau <strong>Tambah Batch</strong> di atas.</div>
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th style={{ width: 40 }}>No</th>
                <th>Nomor Kamar</th>
                <th>Lantai</th>
                <th>Tipe</th>
                <th>Status</th>
                <th>Catatan</th>
                <th style={{ width: 100 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((kamar, i) => {
                const isEditing = editId === kamar.id
                return (
                  <tr key={kamar.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.nomor_kamar ?? ''}
                          onChange={e => setEditForm({ ...editForm, nomor_kamar: e.target.value.toUpperCase() })}
                          style={{ width: 90, fontFamily: 'var(--font-mono)', fontSize: 13, padding: '5px 8px', textTransform: 'uppercase' }}
                        />
                      ) : (
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)', fontSize: 14 }}>
                          {kamar.nomor_kamar}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number" min={1} max={99}
                          value={editForm.lantai ?? 1}
                          onChange={e => setEditForm({ ...editForm, lantai: Number(e.target.value) })}
                          style={{ width: 70, padding: '5px 8px' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{kamar.lantai}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editForm.tipe ?? 'standard'}
                          onChange={e => setEditForm({ ...editForm, tipe: e.target.value })}
                          style={{ width: 120, padding: '5px 8px' }}
                        >
                          <option value="standard">Standard</option>
                          <option value="deluxe">Deluxe</option>
                          <option value="suite">Suite</option>
                          <option value="vip">VIP</option>
                        </select>
                      ) : (
                        <span style={{
                          fontSize: 11, fontFamily: 'var(--font-mono)',
                          padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize',
                          background: kamar.tipe === 'vip' ? '#fef9c3' : kamar.tipe === 'suite' ? '#ede9fe' : kamar.tipe === 'deluxe' ? '#e0f2fe' : 'var(--bg-secondary)',
                          color: kamar.tipe === 'vip' ? '#854d0e' : kamar.tipe === 'suite' ? '#6d28d9' : kamar.tipe === 'deluxe' ? '#0369a1' : 'var(--text-muted)',
                          border: '1px solid',
                          borderColor: kamar.tipe === 'vip' ? '#fde68a' : kamar.tipe === 'suite' ? '#c4b5fd' : kamar.tipe === 'deluxe' ? '#bae6fd' : 'var(--border)',
                        }}>
                          {kamar.tipe}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${kamar.status}`}>{kamar.status}</span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          placeholder="Catatan..."
                          value={editForm.catatan ?? ''}
                          onChange={e => setEditForm({ ...editForm, catatan: e.target.value })}
                          style={{ padding: '5px 8px' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: kamar.catatan ? 'normal' : 'italic' }}>
                          {kamar.catatan || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => saveEdit(kamar.id)}
                            disabled={saving}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--green-border)', background: 'var(--green-light)', color: 'var(--green)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Check size={12} /> Simpan
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => startEdit(kamar)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(kamar)}
                            disabled={kamar.status === 'terisi'}
                            style={{
                              padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text-muted)',
                              cursor: kamar.status === 'terisi' ? 'not-allowed' : 'pointer',
                              opacity: kamar.status === 'terisi' ? 0.35 : 1,
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (kamar.status !== 'terisi') { e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)' } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                            title={kamar.status === 'terisi' ? 'Tidak bisa hapus — kamar sedang terisi' : 'Hapus kamar'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB MEDIA
// ═══════════════════════════════════════════════════════════════
function TabMedia() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [kamarList,       setKamarList]       = useState<Kamar[]>([])
  const [images,          setImages]          = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [uploading,       setUploading]       = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState('')
  const [selectedKamarId, setSelectedKamarId] = useState<string>('')
  const [logoUploading,   setLogoUploading]   = useState(false)
  const [tenantId,        setTenantId]        = useState<string>('')
  const [logoUrl,         setLogoUrl]         = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const tid = await getTenantId(supabase)
    if (!tid) { setLoading(false); return }
    setTenantId(tid)

    const [{ data: kamar }, { data: imgs }, { data: theme }] = await Promise.all([
      supabase.from('kamar').select('*').eq('tenant_id', tid).order('lantai').order('nomor_kamar'),
      supabase.from('kamar_images').select('*').eq('tenant_id', tid).order('urutan'),
      supabase.from('tenant_theme').select('logo_url').eq('tenant_id', tid).single(),
    ])

    if (kamar) {
      setKamarList(kamar)
      setSelectedKamarId(prev => prev || (kamar.length > 0 ? kamar[0].id : ''))
    }
    if (imgs)           setImages(imgs)
    if (theme?.logo_url) setLogoUrl(theme.logo_url)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  function flash(msg: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else                    { setError(msg);   setTimeout(() => setError(''), 4000) }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    if (file.size > 2 * 1024 * 1024) { flash('Logo maksimal 2MB.', 'error'); return }
    if (!['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      flash('Format logo: PNG, JPG, SVG, atau WEBP.', 'error'); return
    }

    setLogoUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${tenantId}/logo/logo.${ext}`

    const { error: upErr } = await supabase.storage
      .from('tenant-media')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { flash(upErr.message, 'error'); setLogoUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(path)

    await supabase.from('tenant_theme').update({ logo_url: publicUrl }).eq('tenant_id', tenantId)

    setLogoUrl(publicUrl)
    flash('Logo berhasil diupload.')
    setLogoUploading(false)
  }

  async function handleFotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !selectedKamarId || !tenantId) return

    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) { flash(`${f.name} melebihi 5MB.`, 'error'); return }
      if (!f.type.startsWith('image/')) { flash(`${f.name} bukan gambar.`, 'error'); return }
    }

    setUploading(true)
    const existingCount = images.filter(img => img.kamar_id === selectedKamarId).length
    console.log('DEBUG upload:', { tenantId, selectedKamarId, files: files.map(f => f.name) })


    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext  = file.name.split('.').pop()
      const path = `${tenantId}/kamar/${selectedKamarId}/${Date.now()}-${i}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('tenant-media')
        .upload(path, file, { contentType: file.type })

        console.log('Upload result:', { upErr, path })

      if (upErr) { flash(`Gagal upload ${file.name}: ${upErr.message}`, 'error'); continue }

      const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(path)

      await supabase.from('kamar_images').insert({
        kamar_id:     selectedKamarId,
        tenant_id:    tenantId,
        url:          publicUrl,
        storage_path: path,
        urutan:       existingCount + i,
        is_cover:     existingCount === 0 && i === 0,
      })
    }

    flash(`${files.length} foto berhasil diupload.`)
    fetchAll()
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSetCover(imgId: string) {
    const kamarImgs = images.filter(img => img.kamar_id === selectedKamarId)
    await Promise.all(kamarImgs.map(img =>
      supabase.from('kamar_images').update({ is_cover: img.id === imgId }).eq('id', img.id)
    ))
    setImages(prev => prev.map(img =>
      img.kamar_id === selectedKamarId ? { ...img, is_cover: img.id === imgId } : img
    ))
    flash('Foto cover diperbarui.')
  }

  async function handleDeleteImg(img: any) {
    if (!confirm('Hapus foto ini?')) return
    await supabase.storage.from('tenant-media').remove([img.storage_path])
    await supabase.from('kamar_images').delete().eq('id', img.id)
    setImages(prev => prev.filter(i => i.id !== img.id))
    flash('Foto dihapus.')
  }

  const selectedKamarImages = images.filter(img => img.kamar_id === selectedKamarId)

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60, gap: 10 }}>
        <div className="loader" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data...</span>
      </div>
    )
  }

  return (
    <div>
      {(success || error) && (
        <div style={{
          background: success ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${success ? 'var(--green-border)' : 'var(--red-border)'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: success ? 'var(--green)' : 'var(--red)',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success || error}
        </div>
      )}

      {/* Logo */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 14 }}>★</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Logo Penginapan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 100, height: 80, borderRadius: 10,
            border: '1.5px dashed var(--border)', background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {logoUrl
              ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 24, color: 'var(--text-muted)' }}>🏠</span>
            }
          </div>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Format: PNG, JPG, SVG, WEBP. Maks 2MB.<br />
              Rekomendasi: transparan background, min 200×80px.
            </p>
            <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
            <button
              className="btn-primary"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              style={{ display: 'flex', alignItems: 'center', gap: 7 }}
            >
              {logoUploading
                ? <><span className="loader" style={{ width: 13, height: 13 }} /> Mengupload...</>
                : <>{logoUrl ? '↑ Ganti Logo' : '↑ Upload Logo'}</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Foto Kamar */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 14 }}>📷</span>
            </div>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Foto Kamar</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kamar:</label>
            <select value={selectedKamarId} onChange={e => setSelectedKamarId(e.target.value)} style={{ width: 140 }}>
              {kamarList.map(k => (
                <option key={k.id} value={k.id}>{k.nomor_kamar} (Lt.{k.lantai})</option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            border: '2px dashed var(--border)', borderRadius: 10,
            padding: '28px 20px', textAlign: 'center',
            background: 'var(--bg-secondary)', marginBottom: 20,
            cursor: 'pointer', transition: 'border-color 0.15s',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent)' }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.style.borderColor = 'var(--border)'
            const fakeEvt = { target: { files: e.dataTransfer.files } } as any
            handleFotoUpload(fakeEvt)
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📸</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            {uploading ? 'Mengupload...' : 'Klik atau drag foto ke sini'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Mendukung beberapa file sekaligus · JPG, PNG, WEBP · Maks 5MB per foto
          </p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFotoUpload} />
        </div>

        {selectedKamarImages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Belum ada foto untuk kamar ini. Upload di atas.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {selectedKamarImages.map(img => (
              <div key={img.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
                <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                {img.is_cover && (
                  <div style={{
                    position: 'absolute', top: 6, left: 6,
                    background: 'var(--accent)', color: '#fff',
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, letterSpacing: '0.06em',
                  }}>
                    COVER
                  </div>
                )}
                <div
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, padding: 8 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                >
                  {!img.is_cover && (
                    <button
                      onClick={() => handleSetCover(img.id)}
                      style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151' }}
                    >
                      Cover
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteImg(img)}
                    style={{ background: 'rgba(239,68,68,0.9)', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 11 }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: HARGA SEWA
// ═══════════════════════════════════════════════════════════════
function TabHarga() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [hargaList, setHargaList] = useState<HargaRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [tenantId,  setTenantId]  = useState<string>('')   // ✅ tambah state
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState<Partial<HargaRow>>({})
  const [showAdd,   setShowAdd]   = useState(false)
  const [addForm,   setAddForm]   = useState({
    lantai: 1, tipe: 'standard',
    harga_harian: '', harga_mingguan: '', harga_bulanan: '',
  })

  // ✅ Fetch tenant_id saat mount
  useEffect(() => {
    getTenantId(supabase).then(tid => { if (tid) setTenantId(tid) })
  }, [supabase])

  const fetchHarga = useCallback(async () => {
    const { data } = await supabase.from('harga').select('*').order('lantai').order('tipe')
    if (data) setHargaList(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchHarga() }, [fetchHarga])

  function flash(msg: string, type: 'success' | 'error' = 'success') {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
    else                    { setError(msg);   setTimeout(() => setError(''), 4000) }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) { flash('Session tidak valid, coba refresh halaman.', 'error'); return }
    if (!addForm.harga_bulanan) { flash('Harga bulanan wajib diisi.', 'error'); return }

    const exists = hargaList.some(h => h.lantai === addForm.lantai && h.tipe === addForm.tipe)
    if (exists) { flash(`Harga untuk lantai ${addForm.lantai} tipe ${addForm.tipe} sudah ada.`, 'error'); return }

    setSaving(true)
    const { error: err } = await supabase.from('harga').insert({
      lantai:         addForm.lantai,
      tipe:           addForm.tipe,
      harga_harian:   addForm.harga_harian   ? Number(addForm.harga_harian)   : null,
      harga_mingguan: addForm.harga_mingguan ? Number(addForm.harga_mingguan) : null,
      harga_bulanan:  Number(addForm.harga_bulanan),
      tenant_id:      tenantId,   // ✅ wajib ada
    })
    if (err) flash(err.message, 'error')
    else { flash('Harga berhasil disimpan.'); setShowAdd(false); fetchHarga() }
    setSaving(false)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const { error: err } = await supabase.from('harga').update({
      harga_harian:   editForm.harga_harian   ? Number(editForm.harga_harian)   : null,
      harga_mingguan: editForm.harga_mingguan ? Number(editForm.harga_mingguan) : null,
      harga_bulanan:  Number(editForm.harga_bulanan),
    }).eq('id', id)
    if (err) flash(err.message, 'error')
    else { flash('Harga diperbarui.'); setEditId(null); fetchHarga() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data harga ini?')) return
    const { error: err } = await supabase.from('harga').delete().eq('id', id)
    if (err) flash(err.message, 'error')
    else { flash('Data harga dihapus.'); fetchHarga() }
  }

  return (
    <div>
      {(success || error) && (
        <div style={{
          background: success ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${success ? 'var(--green-border)' : 'var(--red-border)'}`,
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: success ? 'var(--green)' : 'var(--red)',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {success ? <Check size={14} /> : <AlertCircle size={14} />}
          {success || error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setShowAdd(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={14} strokeWidth={2.5} />
          Tambah Harga
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--accent-mid)', background: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Tambah Harga Sewa</span>
          </div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label className="field-label">Lantai *</label>
                <input type="number" min={1} max={99} value={addForm.lantai}
                  onChange={e => setAddForm({ ...addForm, lantai: Number(e.target.value) })} required />
              </div>
              <div>
                <label className="field-label">Tipe Kamar *</label>
                <select value={addForm.tipe} onChange={e => setAddForm({ ...addForm, tipe: e.target.value })}>
                  <option value="standard">Standard</option>
                  <option value="deluxe">Deluxe</option>
                  <option value="suite">Suite</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="field-label">Harga Harian</label>
                <input type="number" min={0} placeholder="cth: 100000" value={addForm.harga_harian}
                  onChange={e => setAddForm({ ...addForm, harga_harian: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Harga Mingguan</label>
                <input type="number" min={0} placeholder="cth: 600000" value={addForm.harga_mingguan}
                  onChange={e => setAddForm({ ...addForm, harga_mingguan: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Harga Bulanan *</label>
                <input type="number" min={0} placeholder="cth: 1500000" required value={addForm.harga_bulanan}
                  onChange={e => setAddForm({ ...addForm, harga_bulanan: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Batal</button>
              <button type="submit" className="btn-primary" disabled={saving || !tenantId}>
                {saving ? <><span className="loader" style={{ width: 13, height: 13 }} /> Menyimpan...</> : <><Check size={13} /> Simpan Harga</>}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60, gap: 10 }}>
            <div className="loader" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat data harga...</span>
          </div>
        ) : hargaList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>💰</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 4 }}>Belum ada data harga.</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Tambahkan harga sewa per lantai di atas.</div>
          </div>
        ) : (
          <table className="table-hotel">
            <thead>
              <tr>
                <th>Lantai</th>
                <th>Tipe</th>
                <th>Harga Harian</th>
                <th>Harga Mingguan</th>
                <th>Harga Bulanan</th>
                <th style={{ width: 90 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {hargaList.map(h => {
                const isEditing = editId === h.id
                return (
                  <tr key={h.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{h.lantai}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize',
                        background: h.tipe === 'vip' ? '#fef9c3' : h.tipe === 'suite' ? '#ede9fe' : h.tipe === 'deluxe' ? '#e0f2fe' : 'var(--bg-secondary)',
                        color: h.tipe === 'vip' ? '#854d0e' : h.tipe === 'suite' ? '#6d28d9' : h.tipe === 'deluxe' ? '#0369a1' : 'var(--text-muted)',
                        border: '1px solid',
                        borderColor: h.tipe === 'vip' ? '#fde68a' : h.tipe === 'suite' ? '#c4b5fd' : h.tipe === 'deluxe' ? '#bae6fd' : 'var(--border)',
                      }}>
                        {h.tipe}
                      </span>
                    </td>
                    {isEditing ? (
                      <>
                        <td><input type="number" min={0} value={editForm.harga_harian ?? ''} onChange={e => setEditForm({ ...editForm, harga_harian: Number(e.target.value) })} style={{ padding: '5px 8px' }} /></td>
                        <td><input type="number" min={0} value={editForm.harga_mingguan ?? ''} onChange={e => setEditForm({ ...editForm, harga_mingguan: Number(e.target.value) })} style={{ padding: '5px 8px' }} /></td>
                        <td><input type="number" min={0} value={editForm.harga_bulanan ?? ''} onChange={e => setEditForm({ ...editForm, harga_bulanan: Number(e.target.value) })} style={{ padding: '5px 8px' }} /></td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: h.harga_harian ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: h.harga_harian ? 'normal' : 'italic' }}>
                          {h.harga_harian ? formatRupiah(h.harga_harian) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: h.harga_mingguan ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: h.harga_mingguan ? 'normal' : 'italic' }}>
                          {h.harga_mingguan ? formatRupiah(h.harga_mingguan) : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                          {formatRupiah(h.harga_bulanan)}
                        </td>
                      </>
                    )}
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveEdit(h.id)} disabled={saving}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--green-border)', background: 'var(--green-light)', color: 'var(--green)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Simpan
                          </button>
                          <button onClick={() => setEditId(null)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setEditId(h.id); setEditForm({ harga_harian: h.harga_harian ?? undefined, harga_mingguan: h.harga_mingguan ?? undefined, harga_bulanan: h.harga_bulanan }) }}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red-border)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)' }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}