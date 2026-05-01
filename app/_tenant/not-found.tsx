// app/[tenant]/not-found.tsx

export default function TenantNotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif', color: '#374151',
      background: '#f9fafb',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏠</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
        Homestay tidak ditemukan
      </h1>
      <p style={{ color: '#6b7280', marginTop: 8, fontSize: 15 }}>
        Alamat yang kamu tuju tidak tersedia atau sudah tidak aktif.
      </p>
    </div>
  )
}