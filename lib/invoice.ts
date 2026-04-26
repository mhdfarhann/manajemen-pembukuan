// lib/invoice.ts
// Helper functions dan konfigurasi untuk sistem invoice

// ── Konfigurasi Penginapan ────────────────────────────────────────────────────
// Edit bagian ini sesuai data penginapan kamu

export interface InvoiceConfig {
  nama:           string
  tagline?:       string
  alamat?:        string
  kota?:          string
  telepon?:       string
  email?:         string
  catatan_footer?: string
}

export function getInvoiceConfig(): InvoiceConfig {
  return {
    nama:           'Penginapan Anda',     // ← ganti nama penginapan
    tagline:        'Nyaman, Bersih, Terjangkau',
    alamat:         'Jl. Contoh No. 123',  // ← ganti alamat
    kota:           'Kota Anda',           // ← ganti kota
    telepon:        '0812-3456-7890',      // ← ganti nomor telepon
    email:          '',                    // ← opsional, bisa dikosongkan
    catatan_footer: 'Terima kasih telah memilih penginapan kami. Semoga betah dan nyaman!',
  }
}

// ── Generate nomor invoice ────────────────────────────────────────────────────
// Format: INV-YYYYMM-XXXX (4 karakter terakhir dari UUID booking)
// Tidak perlu counter di DB — cukup unik dan mudah dibaca

export function generateInvoiceNumber(bookingId: string): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  // Ambil 6 karakter pertama UUID (cukup untuk display, tidak perlu full UUID)
  const short = bookingId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `INV-${year}${month}-${short}`
}

// ── Alternatif: generate nomor sequential dari Supabase ──────────────────────
// Gunakan ini jika kamu ingin nomor sequential (INV-2025-0001, dst.)
// Jalankan query ini di Supabase SQL editor dulu:
//
//   CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
//
// Lalu panggil fungsi di bawah dengan memanggil RPC:
//
//   const { data } = await supabase.rpc('next_invoice_number')
//
// Dan buat function di Supabase:
//   CREATE OR REPLACE FUNCTION next_invoice_number()
//   RETURNS text AS $$
//   DECLARE
//     seq_val bigint;
//     yr      text;
//   BEGIN
//     SELECT nextval('invoice_seq') INTO seq_val;
//     yr := to_char(now(), 'YYYY');
//     RETURN 'INV-' || yr || '-' || lpad(seq_val::text, 4, '0');
//   END;
//   $$ LANGUAGE plpgsql;

export function formatInvoiceNumberSequential(sequence: number): string {
  const year = new Date().getFullYear()
  return `INV-${year}-${String(sequence).padStart(4, '0')}`
}