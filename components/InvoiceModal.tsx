'use client'
// components/InvoiceModal.tsx

import { useRef } from 'react'
import { format } from 'date-fns'
import { id as localeID } from 'date-fns/locale'
import { X, Printer, Building2 } from 'lucide-react'
import { formatRupiah, labelDurasi, formatNIKDisplay } from '@/lib/harga'
import { generateInvoiceNumber, getInvoiceConfig } from '@/lib/invoice'
import type { Database } from '@/lib/supabase'

type Booking        = Database['public']['Tables']['booking']['Row']
type BookingHistory = Database['public']['Tables']['booking_history']['Row']
type Kamar          = Database['public']['Tables']['kamar']['Row']

interface Props {
  booking:        Booking | BookingHistory
  kamar:          Kamar
  onClose:        () => void
  invoiceNumber?: string
}

export default function InvoiceModal({ booking, kamar, onClose, invoiceNumber }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const config   = getInvoiceConfig()

  const nomor    = invoiceNumber ?? generateInvoiceNumber(booking.id)
  const tglCetak = format(new Date(), 'dd MMMM yyyy', { locale: localeID })
  const tglIn    = format(new Date(booking.tanggal_in),  'dd MMMM yyyy', { locale: localeID })
  const tglOut   = format(new Date(booking.tanggal_out), 'dd MMMM yyyy', { locale: localeID })

  const sisaBayar =
    booking.status_bayar === 'dp' && booking.harga_total && booking.jumlah_dp
      ? Math.max(0, booking.harga_total - booking.jumlah_dp)
      : booking.status_bayar === 'belum' && booking.harga_total
        ? booking.harga_total
        : 0

  const statusLabel: Record<string, string> = {
    belum: 'Belum Bayar',
    dp:    'DP / Sebagian',
    lunas: 'Lunas',
  }

  // ── Print: buka tab baru dengan HTML statis + CSS lengkap ─────────────────
  function handlePrint() {
    const printWindow = window.open('', '_blank', 'width=860,height=1000')
    if (!printWindow) {
      alert('Popup diblokir browser. Izinkan popup untuk halaman ini lalu coba lagi.')
      return
    }

    const dp      = booking.jumlah_dp   ?? 0
    const total   = booking.harga_total ?? 0
    const statusS = booking.status_bayar ?? 'belum'

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<title>Invoice ${nomor}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --text-primary:#0f172a;--text-secondary:#475569;--text-muted:#94a3b8;
  --border:#e2e8f0;--bg:#fff;--bg-secondary:#f8fafc;
  --accent:#2563eb;--accent-light:#eff6ff;
  --green:#16a34a;--green-light:#f0fdf4;--green-border:#bbf7d0;
  --amber:#d97706;--amber-light:#fffbeb;--amber-border:#fde68a;
  --red:#dc2626;--red-light:#fef2f2;--red-border:#fecaca;
  --mono:'Courier New',Courier,monospace;
}
body{font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:var(--text-primary);background:#fff;padding:40px;max-width:760px;margin:0 auto;line-height:1.5;position:relative}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.logo-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.logo-icon{width:40px;height:40px;border-radius:10px;background:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;font-size:20px;font-weight:700}
.co-name{font-size:18px;font-weight:700;color:var(--text-primary)}
.co-tag{font-size:11px;color:var(--text-muted);font-family:var(--mono)}
.co-detail{font-size:11px;color:var(--text-secondary);line-height:1.7;margin-left:50px}
.inv-meta{text-align:right}
.inv-title{font-family:var(--mono);font-size:24px;font-weight:700;color:var(--accent);margin-bottom:4px}
.inv-num{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:3px}
.inv-date{font-size:11px;color:var(--text-muted)}
.divider{height:1px;background:var(--border);margin:20px 0}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.sec-label{font-size:9px;font-family:var(--mono);letter-spacing:.1em;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px}
.tamu-name{font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
.tamu-det{font-size:12px;color:var(--text-secondary);margin-bottom:2px;font-family:var(--mono)}
.irow{display:flex;gap:8px;margin-bottom:3px}
.ilabel{font-size:12px;color:var(--text-muted);min-width:50px}
.ival{font-size:12px;color:var(--text-primary);font-weight:500}
.table-wrap{border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:24px}
.th{display:grid;grid-template-columns:1fr 160px 140px;background:var(--bg-secondary);padding:10px 16px;border-bottom:1px solid var(--border)}
.thc{font-size:9px;font-family:var(--mono);letter-spacing:.07em;color:var(--text-muted);text-transform:uppercase}
.thc.r{text-align:right}
.tr{display:grid;grid-template-columns:1fr 160px 140px;padding:14px 16px;border-bottom:1px solid var(--border);align-items:center}
.item-name{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:2px}
.item-sub{font-size:11px;color:var(--text-secondary)}
.item-note{font-size:10px;color:var(--text-muted);margin-top:4px;font-style:italic}
.pcol{text-align:right}
.pdate{font-size:11px;color:var(--text-secondary)}
.psep{font-size:10px;color:var(--text-muted)}
.pdur{font-size:10px;color:var(--text-muted);margin-top:2px;font-family:var(--mono)}
.hcol{text-align:right}
.hval{font-size:15px;font-weight:700;color:var(--text-primary);font-family:var(--mono)}
.sub-row{display:grid;grid-template-columns:1fr 140px;padding:12px 16px;background:var(--bg-secondary)}
.sub-l{font-size:13px;color:var(--text-secondary)}
.sub-v{font-size:13px;font-family:var(--mono);font-weight:600;color:var(--text-primary);text-align:right}
.sum-grid{display:grid;grid-template-columns:1fr 280px;gap:24px;margin-bottom:28px}
.badge{display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:5px 14px}
.dot{width:7px;height:7px;border-radius:50%}
.badge-text{font-family:var(--mono);font-size:11px;font-weight:600}
.s-belum .badge{background:var(--red-light);border:1px solid var(--red-border)}
.s-belum .dot{background:var(--red)}
.s-belum .badge-text{color:var(--red)}
.s-dp    .badge{background:var(--amber-light);border:1px solid var(--amber-border)}
.s-dp    .dot{background:var(--amber)}
.s-dp    .badge-text{color:var(--amber)}
.s-lunas .badge{background:var(--green-light);border:1px solid var(--green-border)}
.s-lunas .dot{background:var(--green)}
.s-lunas .badge-text{color:var(--green)}
.pay-table{border:1px solid var(--border);border-radius:10px;overflow:hidden}
.pay-row{display:flex;justify-content:space-between;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border)}
.pay-l{font-size:12px;color:var(--text-secondary)}
.pay-v{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--text-primary)}
.pay-v.g{color:var(--green)}.pay-v.a{color:var(--amber)}.pay-v.r{color:var(--red)}
.pay-tot{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--accent)}
.pt-l{font-size:12px;font-weight:600;color:#fff}
.pt-v{font-family:var(--mono);font-size:15px;font-weight:700;color:#fff}
.footer{display:flex;justify-content:space-between;align-items:flex-end}
.fn{font-size:11px;color:var(--text-muted);line-height:1.6;max-width:300px}
.fn-sys{font-family:var(--mono);font-size:10px;opacity:.6;margin-top:4px}
.ttd{text-align:center}
.ttd-sp{height:52px}
.ttd-ln{height:1px;width:140px;background:var(--border);margin-bottom:4px}
.ttd-n{font-size:11px;color:var(--text-secondary)}
.ttd-s{font-size:10px;color:var(--text-muted)}
.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:72px;font-weight:900;pointer-events:none;user-select:none;letter-spacing:.05em;white-space:nowrap;font-family:var(--mono);z-index:0}
.wm.belum{color:rgba(220,38,38,.07)}.wm.dp{color:rgba(245,158,11,.07)}
@media print{body{padding:0}@page{size:A4 portrait;margin:18mm 15mm}}
</style>
</head>
<body>

${statusS !== 'lunas' ? `<div class="wm ${statusS}">${statusS === 'belum' ? 'BELUM LUNAS' : 'DP'}</div>` : ''}

<div class="header">
  <div>
    <div class="logo-row">
      <div class="logo-icon">&#127968;</div>
      <div>
        <div class="co-name">${config.nama}</div>
        ${config.tagline ? `<div class="co-tag">${config.tagline}</div>` : ''}
      </div>
    </div>
    <div class="co-detail">
      ${config.alamat  ? `<div>${config.alamat}</div>`         : ''}
      ${config.kota    ? `<div>${config.kota}</div>`           : ''}
      ${config.telepon ? `<div>Telp: ${config.telepon}</div>` : ''}
      ${config.email   ? `<div>${config.email}</div>`          : ''}
    </div>
  </div>
  <div class="inv-meta">
    <div class="inv-title">INVOICE</div>
    <div class="inv-num">${nomor}</div>
    <div class="inv-date">Dicetak: ${tglCetak}</div>
  </div>
</div>

<div class="divider"></div>

<div class="grid2">
  <div>
    <div class="sec-label">Tagihan Kepada</div>
    <div class="tamu-name">${booking.nama_tamu}</div>
    ${booking.nik      ? `<div class="tamu-det">NIK: ${formatNIKDisplay(booking.nik)}</div>` : ''}
    ${booking.nomor_hp ? `<div class="tamu-det">HP: ${booking.nomor_hp}</div>`               : ''}
  </div>
  <div>
    <div class="sec-label">Detail Kamar</div>
    <div class="irow"><span class="ilabel">Kamar</span><span class="ival">: No. ${kamar.nomor_kamar}</span></div>
    <div class="irow"><span class="ilabel">Lantai</span><span class="ival">: Lantai ${kamar.lantai}</span></div>
    <div class="irow"><span class="ilabel">Tipe</span><span class="ival">: ${kamar.tipe ?? 'Standard'}</span></div>
  </div>
</div>

<div class="table-wrap">
  <div class="th">
    <div class="thc">Deskripsi</div>
    <div class="thc r">Periode</div>
    <div class="thc r">Jumlah</div>
  </div>
  <div class="tr">
    <div>
      <div class="item-name">Sewa Kamar ${kamar.nomor_kamar}</div>
      <div class="item-sub">Lantai ${kamar.lantai} &middot; ${kamar.tipe ?? 'Standard'}</div>
      ${booking.catatan ? `<div class="item-note">Catatan: ${booking.catatan}</div>` : ''}
    </div>
    <div class="pcol">
      <div class="pdate">${tglIn}</div>
      <div class="psep">s/d</div>
      <div class="pdate">${tglOut}</div>
      <div class="pdur">${typeof booking.durasi === 'number' ? labelDurasi(booking.durasi) : (booking.durasi ?? '')}</div>
    </div>
    <div class="hcol">
      <div class="hval">${total ? formatRupiah(total) : '&mdash;'}</div>
    </div>
  </div>
  <div class="sub-row">
    <div class="sub-l">Subtotal</div>
    <div class="sub-v">${total ? formatRupiah(total) : '&mdash;'}</div>
  </div>
</div>

<div class="sum-grid">
  <div class="s-${statusS}">
    <div class="sec-label">Status Pembayaran</div>
    <div class="badge">
      <div class="dot"></div>
      <span class="badge-text">${statusLabel[statusS]}</span>
    </div>
  </div>
  <div class="pay-table">
    <div class="pay-row">
      <span class="pay-l">Total Tagihan</span>
      <span class="pay-v">${total ? formatRupiah(total) : '&mdash;'}</span>
    </div>
    ${statusS === 'dp' && dp ? `
    <div class="pay-row">
      <span class="pay-l">DP Dibayar</span>
      <span class="pay-v a">${formatRupiah(dp)}</span>
    </div>
    <div class="pay-row">
      <span class="pay-l">Sisa Tagihan</span>
      <span class="pay-v r">${formatRupiah(sisaBayar)}</span>
    </div>` : ''}
    ${statusS === 'lunas' ? `
    <div class="pay-row">
      <span class="pay-l">Terbayar</span>
      <span class="pay-v g">${total ? formatRupiah(total) : '&mdash;'}</span>
    </div>` : ''}
    ${statusS === 'belum' ? `
    <div class="pay-row">
      <span class="pay-l">Belum Dibayar</span>
      <span class="pay-v r">${total ? formatRupiah(total) : '&mdash;'}</span>
    </div>` : ''}
    <div class="pay-tot">
      <span class="pt-l">${statusS === 'dp' ? 'Sisa yang Harus Dibayar' : 'Total Tagihan'}</span>
      <span class="pt-v">${
        statusS === 'dp'
          ? formatRupiah(sisaBayar)
          : statusS === 'lunas'
            ? 'LUNAS'
            : total ? formatRupiah(total) : '&mdash;'
      }</span>
    </div>
  </div>
</div>

<div class="divider"></div>

<div class="footer">
  <div class="fn">
    ${config.catatan_footer ? `<div>${config.catatan_footer}</div>` : ''}
    <div class="fn-sys">Dokumen ini digenerate otomatis oleh sistem. Harap simpan sebagai bukti pembayaran.</div>
  </div>
  <div class="ttd">
    <div class="ttd-sp"></div>
    <div class="ttd-ln"></div>
    <div class="ttd-n">Petugas / Pengelola</div>
    <div class="ttd-s">${config.nama}</div>
  </div>
</div>

<script>window.onload=function(){setTimeout(function(){window.print()},400)}<\/script>
</body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // ── Render modal preview ──────────────────────────────────────────────────
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'flex-start', paddingTop: 24, paddingBottom: 24, overflowY: 'auto' }}
    >
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>

        {/* Toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 12, padding: '0 4px',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-light)', border: '1px solid var(--accent-mid)',
            borderRadius: 20, padding: '3px 10px',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>
              INVOICE · {nomor}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
            >
              <Printer size={13} /> Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-secondary)', border: 'none',
                borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div
          ref={printRef}
          style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 40,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Building2 size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{config.nama}</div>
                  {config.tagline && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{config.tagline}</div>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginLeft: 50 }}>
                {config.alamat  && <div>{config.alamat}</div>}
                {config.kota    && <div>{config.kota}</div>}
                {config.telepon && <div>Telp: {config.telepon}</div>}
                {config.email   && <div>{config.email}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>INVOICE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{nomor}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Dicetak: {tglCetak}</div>
            </div>
          </div>

          <div className="divider" />

          {/* Tamu & Kamar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Tagihan Kepada</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{booking.nama_tamu}</div>
              {booking.nik      && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>NIK: {formatNIKDisplay(booking.nik)}</div>}
              {booking.nomor_hp && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>HP: {booking.nomor_hp}</div>}
            </div>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Detail Kamar</div>
              {[['Kamar', `No. ${kamar.nomor_kamar}`], ['Lantai', `Lantai ${kamar.lantai}`], ['Tipe', kamar.tipe ?? 'Standard']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 50 }}>{l}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>: {v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabel */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', background: 'var(--bg-secondary)', padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              {['Deskripsi', 'Periode', 'Jumlah'].map((h, i) => (
                <div key={h} style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 140px', padding: '14px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Sewa Kamar {kamar.nomor_kamar}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Lantai {kamar.lantai} · {kamar.tipe ?? 'Standard'}</div>
                {booking.catatan && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>Catatan: {booking.catatan}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tglIn}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>s/d</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tglOut}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {typeof booking.durasi === 'number' ? labelDurasi(booking.durasi) : booking.durasi}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {booking.harga_total ? formatRupiah(booking.harga_total) : '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', padding: '12px 16px', background: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Subtotal</div>
              <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                {booking.harga_total ? formatRupiah(booking.harga_total) : '—'}
              </div>
            </div>
          </div>

          {/* Ringkasan */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Status Pembayaran</div>
              <StatusBadge status={booking.status_bayar ?? 'belum'} label={statusLabel[booking.status_bayar ?? 'belum']} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <PayRow label="Total Tagihan" val={booking.harga_total ? formatRupiah(booking.harga_total) : '—'} />
              {booking.status_bayar === 'dp' && booking.jumlah_dp && <>
                <PayRow label="DP Dibayar"   val={formatRupiah(booking.jumlah_dp)} accent="var(--amber)" />
                <PayRow label="Sisa Tagihan" val={formatRupiah(sisaBayar)}         accent="var(--red)"   />
              </>}
              {booking.status_bayar === 'lunas' && (
                <PayRow label="Terbayar" val={booking.harga_total ? formatRupiah(booking.harga_total) : '—'} accent="var(--green)" />
              )}
              {booking.status_bayar === 'belum' && (
                <PayRow label="Belum Dibayar" val={booking.harga_total ? formatRupiah(booking.harga_total) : '—'} accent="var(--red)" />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--accent)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>
                  {booking.status_bayar === 'dp' ? 'Sisa yang Harus Dibayar' : 'Total Tagihan'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'white' }}>
                  {booking.status_bayar === 'dp'
                    ? formatRupiah(sisaBayar)
                    : booking.status_bayar === 'lunas'
                      ? 'LUNAS'
                      : booking.harga_total ? formatRupiah(booking.harga_total) : '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 300 }}>
              {config.catatan_footer && <div style={{ marginBottom: 4 }}>{config.catatan_footer}</div>}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, opacity: 0.6 }}>
                Dokumen ini digenerate otomatis oleh sistem. Harap simpan sebagai bukti pembayaran.
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: 48, marginBottom: 4 }} />
              <div style={{ height: 1, width: 140, background: 'var(--border)', marginBottom: 4 }} />
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Petugas / Pengelola</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{config.nama}</div>
            </div>
          </div>
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    belum: { color: 'var(--red)',   bg: 'var(--red-light)',   border: 'var(--red-border)'   },
    dp:    { color: 'var(--amber)', bg: 'var(--amber-light)', border: 'var(--amber-border)' },
    lunas: { color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)' },
  }
  const s = map[status] ?? map.belum
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '5px 14px' }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: s.color, fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function PayRow({ label, val, accent }: { label: string; val: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: accent ?? 'var(--text-primary)' }}>{val}</div>
    </div>
  )
}