'use client'
// components/InvoiceButton.tsx
// Komponen tombol invoice yang bisa dipakai di halaman history
// Usage: <InvoiceButton bookingHistory={row} kamar={kamarData} />

import { useState } from 'react'
import { Printer } from 'lucide-react'
import InvoiceModal from './InvoiceModal'
import type { Database } from '@/lib/supabase'

type BookingHistory = Database['public']['Tables']['booking_history']['Row']
type Kamar          = Database['public']['Tables']['kamar']['Row']

interface Props {
  bookingHistory: BookingHistory
  kamar:          Kamar
  // Tampilan tombol: 'icon' = hanya ikon, 'full' = ikon + teks
  variant?: 'icon' | 'full'
}

export default function InvoiceButton({ bookingHistory, kamar, variant = 'full' }: Props) {
  const [show, setShow] = useState(false)

  return (
    <>
      <button
        onClick={() => setShow(true)}
        title="Cetak Invoice"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: variant === 'icon' ? '6px 8px' : '6px 12px',
          borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--bg)',
          color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 12,
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent-mid)'
          e.currentTarget.style.color = 'var(--accent)'
          e.currentTarget.style.background = 'var(--accent-light)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'var(--bg)'
        }}
      >
        <Printer size={13} />
        {variant === 'full' && 'Invoice'}
      </button>

      {show && (
        <InvoiceModal
          booking={bookingHistory}
          kamar={kamar}
          onClose={() => setShow(false)}
        />
      )}
    </>
  )
}