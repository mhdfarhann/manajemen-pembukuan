'use client'
// app/(dashboard)/pengaturan/page.tsx

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient, type Database } from '@/lib/supabase'
import { formatRupiah } from '@/lib/harga'
import {
  Plus, Trash2, Pencil, Check, X, Building2,
  ChevronDown, ChevronUp, Hash, Layers, Tag,
  DollarSign, AlertCircle, PackagePlus, Settings2
} from 'lucide-react'

type Kamar   = Database['public']['Tables']['kamar']['Row']
type HargaRow = Database['public']['Tables']['harga']['Row']

// ─── Tab navigation ──────────────────────────────────────────
type Tab = 'kamar' | 'harga'

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

      {activeTab === 'kamar' ? <TabKamar /> : <TabHarga />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: MANAJEMEN KAMAR
// ═══════════════════════════════════════════════════════════════
function TabKamar() {
  const supabaseRef = useRef(createClient())
  const supabase    = supabaseRef.current

  const [kamarList, setKamarList] = useState<Kamar[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  // Edit inline state
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Kamar>>({})

  // Form tambah single kamar
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ nomor_kamar: '', lantai: 1, tipe: 'standard', catatan: '' })

  // Form tambah batch (multiple kamar sekaligus)
  const [showBatch,  setShowBatch]  = useState(false)
  const [batchLantai, setBatchLantai] = useState(1)
  const [batchDari,   setBatchDari]   = useState(1)
  const [batchSampai, setBatchSampai] = useState(10)
  const [batchPrefix, setBatchPrefix] = useState('')
  const [batchTipe,   setBatchTipe]   = useState('standard')

  // Filter tampilan
  const [filterLantai, setFilterLantai] = useState<number | ''>('')

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
    setSaving(true)
    setError('')

    const nomor = addForm.nomor_kamar.trim().toUpperCase()
    if (!nomor) { flash('Nomor kamar wajib diisi.', 'error'); setSaving(false); return }

    // Cek duplikat
    const exists = kamarList.some(k => k.nomor_kamar === nomor)
    if (exists) { flash(`Kamar ${nomor} sudah ada.`, 'error'); setSaving(false); return }

    const { error: err } = await supabase.from('kamar').insert({
      nomor_kamar: nomor,
      lantai:      addForm.lantai,
      tipe:        addForm.tipe,
      catatan:     addForm.catatan || null,
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
    if (batchDari > batchSampai) { flash('Angka awal harus ≤ angka akhir.', 'error'); return }
    if (batchSampai - batchDari > 49) { flash('Maksimal 50 kamar sekaligus.', 'error'); return }

    setSaving(true)
    const prefix = batchPrefix.trim().toUpperCase()

    // Generate nomor kamar: prefix + lantai + urutan (contoh: 101-110, atau A101-A110)
    const newKamar = []
    for (let i = batchDari; i <= batchSampai; i++) {
      const nomor = prefix
        ? `${prefix}${batchLantai}${String(i).padStart(2, '0')}`
        : `${batchLantai}${String(i).padStart(2, '0')}`
      // Skip yang sudah ada
      if (!kamarList.some(k => k.nomor_kamar === nomor)) {
        newKamar.push({ nomor_kamar: nomor, lantai: batchLantai, tipe: batchTipe })
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

  // Preview nomor kamar batch
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
      {/* Feedback */}
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

      {/* Toolbar */}
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
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Plus size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              Tambah Kamar Baru
            </span>
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
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Batal
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
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
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PackagePlus size={14} color="#fff" />
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
              Tambah Kamar Sekaligus (Batch)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label className="field-label">
                <Layers size={10} style={{ display: 'inline', marginRight: 3 }} />
                Lantai
              </label>
              <input
                type="number" min={1} max={99}
                value={batchLantai}
                onChange={e => setBatchLantai(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="field-label">
                <Hash size={10} style={{ display: 'inline', marginRight: 3 }} />
                Nomor Dari
              </label>
              <input
                type="number" min={1}
                value={batchDari}
                onChange={e => setBatchDari(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="field-label">
                <Hash size={10} style={{ display: 'inline', marginRight: 3 }} />
                Nomor Sampai
              </label>
              <input
                type="number" min={1}
                value={batchSampai}
                onChange={e => setBatchSampai(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="field-label">
                <Tag size={10} style={{ display: 'inline', marginRight: 3 }} />
                Prefix (opsional)
              </label>
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
                  key={t}
                  type="button"
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

          {/* Preview */}
          <div style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
          }}>
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
              disabled={saving}
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
        {/* Summary strip per lantai */}
        {!loading && (
          <div style={{
            display: 'flex', gap: 0,
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto',
          }}>
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
                    cursor: 'pointer', transition: 'background 0.15s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: filterLantai === l ? 'var(--accent)' : 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 2 }}>
                    LANTAI {l}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {total} kamar ·{' '}
                    <span style={{ color: 'var(--green)' }}>{kosong} kosong</span>
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

                    {/* Nomor kamar */}
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

                    {/* Lantai */}
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

                    {/* Tipe */}
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
                          padding: '2px 8px', borderRadius: 20,
                          textTransform: 'capitalize',
                          background: kamar.tipe === 'vip' ? '#fef9c3' : kamar.tipe === 'suite' ? '#ede9fe' : kamar.tipe === 'deluxe' ? '#e0f2fe' : 'var(--bg-secondary)',
                          color: kamar.tipe === 'vip' ? '#854d0e' : kamar.tipe === 'suite' ? '#6d28d9' : kamar.tipe === 'deluxe' ? '#0369a1' : 'var(--text-muted)',
                          border: '1px solid',
                          borderColor: kamar.tipe === 'vip' ? '#fde68a' : kamar.tipe === 'suite' ? '#c4b5fd' : kamar.tipe === 'deluxe' ? '#bae6fd' : 'var(--border)',
                        }}>
                          {kamar.tipe}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge badge-${kamar.status}`}>
                        {kamar.status}
                      </span>
                    </td>

                    {/* Catatan */}
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

                    {/* Aksi */}
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => saveEdit(kamar.id)}
                            disabled={saving}
                            style={{
                              padding: '5px 10px', borderRadius: 6, border: '1px solid var(--green-border)',
                              background: 'var(--green-light)', color: 'var(--green)',
                              cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Check size={12} /> Simpan
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            style={{
                              padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text-muted)',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => startEdit(kamar)}
                            style={{
                              padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)',
                              background: 'transparent', color: 'var(--text-muted)',
                              cursor: 'pointer', transition: 'all 0.15s',
                            }}
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
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState<Partial<HargaRow>>({})
  const [showAdd,   setShowAdd]   = useState(false)
  const [addForm,   setAddForm]   = useState({
    lantai: 1, tipe: 'standard',
    harga_harian: '', harga_mingguan: '', harga_bulanan: '',
  })

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
    if (!addForm.harga_bulanan) { flash('Harga bulanan wajib diisi.', 'error'); return }

    // Cek duplikat lantai+tipe
    const exists = hargaList.some(h => h.lantai === addForm.lantai && h.tipe === addForm.tipe)
    if (exists) { flash(`Harga untuk lantai ${addForm.lantai} tipe ${addForm.tipe} sudah ada.`, 'error'); return }

    setSaving(true)
    const { error: err } = await supabase.from('harga').insert({
      lantai:          addForm.lantai,
      tipe:            addForm.tipe,
      harga_harian:    addForm.harga_harian   ? Number(addForm.harga_harian)   : null,
      harga_mingguan:  addForm.harga_mingguan ? Number(addForm.harga_mingguan) : null,
      harga_bulanan:   Number(addForm.harga_bulanan),
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
        <button
          className="btn-primary"
          onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7 }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Tambah Harga
        </button>
      </div>

      {/* Form tambah harga */}
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
                <input type="number" min={0} placeholder="cth: 100000"
                  value={addForm.harga_harian}
                  onChange={e => setAddForm({ ...addForm, harga_harian: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Harga Mingguan</label>
                <input type="number" min={0} placeholder="cth: 600000"
                  value={addForm.harga_mingguan}
                  onChange={e => setAddForm({ ...addForm, harga_mingguan: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Harga Bulanan *</label>
                <input type="number" min={0} placeholder="cth: 1500000" required
                  value={addForm.harga_bulanan}
                  onChange={e => setAddForm({ ...addForm, harga_bulanan: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Batal</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? <><span className="loader" style={{ width: 13, height: 13 }} /> Menyimpan...</> : <><Check size={13} /> Simpan Harga</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel harga */}
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {h.lantai}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontFamily: 'var(--font-mono)', padding: '2px 8px', borderRadius: 20,
                        textTransform: 'capitalize',
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
                          <button
                            onClick={() => saveEdit(h.id)}
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