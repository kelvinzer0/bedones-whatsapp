# WhatsApp Agent - Daftar Tugas

## Endpoint Backend yang harus diimplementasikan

### 1. POST /agent/can-process (PRIORITAS TINGGI)

**Deskripsi**: Memvalidasi apakah agent harus memproses pesan

**Request**:

```typescript
{
  chatId: string; // Format: 237xxx@c.us
  message: string;
  timestamp: string; // ISO 8601
}
```

**Response**:

```typescript
{
  allowed: boolean;
  reason?: string;                   // Jika allowed=false, mengapa
  agentContext?: string;             // Konteks bisnis perusahaan
  managementGroupId?: string;        // ID grup manajemen
  agentId?: string;                  // ID agent yang dikonfigurasi
}
```

**Kasus penggunaan**:

- Periksa jam buka
- Filter spam/pesan terlarang
- Route ke agent berbeda sesuai konteks
- Terapkan aturan bisnis khusus
- Blokir kontak tertentu

**Status saat ini**:

- Endpoint belum diimplementasikan
- Fallback: mengizinkan semua pesan jika endpoint 404
- Interface TypeScript didefinisikan dalam `whatsapp-agent.service.ts`

---

### 2. POST /agent/log-operation (PRIORITAS SEDANG)

**Deskripsi**: Mencatat semua operasi agent
