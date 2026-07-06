# RENCANA ONBOARDING - WhatsApp Agent

---

## INSTRUKSI UNTUK CLAUDE

> **File ini adalah rencana induk untuk implementasi sistem onboarding lanjutan.**

### Aturan pembaruan

1. **Di setiap sesi kerja**, Anda WAJIB:
   - Memperbarui status tugas (⬜ To-do / 🔄 Sedang berjalan / ✅ Selesai)
   - Menambahkan entri di CHANGELOG dengan tanggal dan apa yang telah dilakukan
   - Memperbarui PROGRES GLOBAL
   - Mencatat keputusan teknis penting
   - Mendokumentasikan blocker atau masalah yang ditemui

2. **Jika pengguna mengubah spesifikasi**, Anda WAJIB:
   - Memperbarui bagian terkait
   - Mencatat perubahan di CHANGELOG
   - Menyesuaikan checklist jika perlu

3. **Simbol status**:
   - ⬜ To-do
   - 🔄 Sedang berjalan
   - ✅ Selesai
   - ⚠️ Terblokir
   - ❌ Dibatalkan

4. **File ini harus selalu mencerminkan status proyek saat ini**

---

## GAMBARAN UMUM

### Tujuan

Membuat sistem onboarding cerdas yang:
- Menganalisis katalog dan bisnis pengguna secara otomatis
- Menghasilkan konteks awal untuk agent AI
- Meningkatkan konteks ini melalui chat percakapan dengan pengguna
- Mencapai skor minimum **80%** sebelum aktivasi (dengan peringatan jika < 80%)
- Memungkinkan strategi aktivasi berbeda (test, tags, global)

### Pengalaman Pengguna (3-4 langkah)

> **Penting**: Pengguna hanya melihat 3-4 langkah dengan animasi. Fase teknis (SYNC, ANALYSE) otomatis di latar belakang.

```
1. Koneksi WhatsApp    -> Ilustrasi animasi (sync + analisis di latar belakang)
2. Chat dengan AI      -> Peningkatan konteks
3. Pemilihan strategi  -> Pilihan mode aktivasi
4. Dashboard           -> Sistem aktif
```

### Distinction UserStatus vs OnboardingStatus

- **UserStatus** (enum yang ada): Mengelola siklus hidup global autentikasi
  - `PENDING_PAIRING -> PAIRING -> PAIRED -> ONBOARDING -> ACTIVE`
- **OnboardingStatus** (baru): Mengelola kemajuan dalam onboarding setelah terhubung
  - `SYNC_CATALOG -> ANALYSE_PRODUCTS -> ANALYSE_COMPANY -> CONTEXT_IMPROVEMENT -> STRATEGY_SELECTION -> ACTIVE`

### Flow status OnboardingStatus

```
SYNC_CATALOG -> ANALYSE_PRODUCTS -> ANALYSE_COMPANY -> CONTEXT_IMPROVEMENT -> STRATEGY_SELECTION -> ACTIVE
```

### Diagram flow

```
┌─────────────────┐
│ User konek      │
│ WhatsApp        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ SYNC_CATALOG    │ <- Upload katalog + info bisnis
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ANALYSE_PRODUCTS│ <- AI menganalisis 4 gambar/produk (Grok/Gemini)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ANALYSE_COMPANY │ <- Pembuatan konteks awal + skor
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CONTEXT_        │ <- Chat AI dengan tools untuk meningkatkan
│ IMPROVEMENT     │   konteks hingga skor >= 90%
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STRATEGY_       │ <- Pilihan: nomor test / tags / semua
│ SELECTION       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ACTIVE          │ <- Sistem operasional
└─────────────────┘
```

---

## PROGRES GLOBAL

| Fase | Nama | Status | Progres | Catatan |
|-------|-----|--------|---------|---------|
| 1 | Koneksi & Sync | ⬜ | 0% | Sebagian ada |
| 2 | Analisis Produk | ⬜ | 0% | |
| 3 | Analisis Perusahaan | ⬜ | 0% | |
| 4 | Peningkatan Konteks | ⬜ | 0% | |
| 5 | Pemilihan Strategi | ⬜ | 0% | |
| 6 | Sistem Aktif | ⬜ | 0% | |
| 7 | Dashboard | ⬜ | 0% | |

**Progres total: 0%**

---

## MODIFIKASI DATABASE

### Enum Baru: OnboardingStatus

```prisma
enum OnboardingStatus {
  SYNC_CATALOG        // Sinkronisasi katalog berjalan
  ANALYSE_PRODUCTS    // Analisis AI gambar produk
  ANALYSE_COMPANY     // Analisis perusahaan dan pembuatan konteks
  CONTEXT_IMPROVEMENT // Peningkatan konteks via chat AI
  STRATEGY_SELECTION  // Pemilihan strategi aktivasi
  ACTIVE              // Sistem diaktifkan
}
```

### Modifikasi model WhatsappAgent

```prisma
model WhatsAppAgent {
  // ... field yang ada ...

  // Field baru
  onboardingStatus    OnboardingStatus    @default(SYNC_CATALOG)
  agentContext        String?             @db.Text    // Konteks dalam format MARKDOWN
  contextScore        Int                 @default(0) // Skor konteks (0-100)
  contextNeeds        String?             @db.Text    // Kebutuhan dalam format MARKDOWN
  activationStrategy  Json?               // {type: 'test'|'tags'|'all', phoneNumbers?: [], tagIds?: []}

  // Relasi
  contextVersions     AgentContextVersion[]
}
```

### Format Markdown untuk Konteks dan Kebutuhan

> **Penting**: Konteks dan kebutuhan disimpan dalam **Markdown** untuk memungkinkan:
> - Render terformat di UI
> - Komentar pengguna pada bagian (hover)
> - Bagian yang dapat dilipat/dibuka
> - Keterbacaan lebih baik

#### Struktur `agentContext` (Markdown)

```markdown
# Konteks Agent - {business_name}

## Perusahaan

### Informasi umum
- **Nama**: {name}
- **Sektor**: {sector}
- **Deskripsi**: {description}

### Kontak
- **Telepon dukungan**: {phone}
- **Email**: {email}
- **Alamat**: {address}

### Jam operasional
{business_hours_table}

---

## Kebijakan komersial

### Harga
- **Tipe**: {Tetap | Negosiasi}
- **Diskon maks**: {percentage}%

### Pembayaran yang diterima
- {payment_methods_list}

### Pengiriman
| Kota | Biaya |
|-------|-------|
| {city} | {price} FCFA |

### Pengembalian
- **Diterima**: {Ya | Tidak}
- **Batas waktu**: {days} hari

---

## Katalog

### Koleksi
{collections_summary}

### Produk ({count} total)

<details>
<summary>📁 {collection_name} ({product_count} produk)</summary>

#### {product_name}
- **Harga**: {price} FCFA
- **Deskripsi**: {description}
- **Analisis AI**: {ia_analysis_summary}

</details>

---

## Organisasi

### Tag yang dikonfigurasi
- 🟢 **Klien baru**: {description}
- 🔵 **Klien untuk ditindaklanjuti**: {description}
- 🔴 **Pribadi**: Percakapan untuk diabaikan

### Grup
- **Pengiriman**: {members}
- **Tim**: {members}

---

## Perilaku agent

### Percakapan untuk diabaikan
- Kontak pribadi: {list}
- Tag: Pribadi

### Nada komunikasi
{communication_style}
```

#### Struktur `contextNeeds` (Markdown)

```markdown
# Kebutuhan untuk meningkatkan konteks

**Skor saat ini**: {score}% | **Target**: 80%

---

## 🔴 Prioritas tinggi ({count})

### Kebijakan harga
> Apakah harga tetap atau dapat dinegosiasikan?

**Mengapa ini penting**: Memungkinkan agent tahu apakah dapat menawarkan diskon.

- [ ] Belum dijawab

---

### Zona pengiriman
> Ke kota mana Anda mengirim dan berapa tarifnya?

**Mengapa ini penting**: Agent dapat memberi tahu klien tentang ketersediaan dan biaya.

- [ ] Belum dijawab

---

## 🟡 Prioritas sedang ({count})

### Nomor dukungan
> Nomor berapa yang harus dihubungi klien untuk dukungan?

- [ ] Belum dijawab

---

## 🟢 Prioritas rendah ({count})

### Jam operasional detail
> Apa jam buka Anda per hari?

- [x] Sudah dijawab ✓

---

## ✅ Selesai ({count})

<details>
<summary>Lihat item yang selesai</summary>

- [x] Sektor bisnis
- [x] Deskripsi perusahaan
- [x] Metode pembayaran

</details>
```

### Fitur UI untuk Markdown

UI frontend harus mendukung:

1. **Render Markdown** dengan library (react-markdown, marked, dll.)
2. **Bagian dapat dilipat** via `<details>/<summary>` atau komponen custom
3. **Komentar inline**: Hover pada bagian -> tombol "Komentar" -> input
4. **Checkbox interaktif**: Klik `[ ]` -> tandai sebagai selesai
5. **Highlighting**: Bagian yang baru dimodifikasi
6. **Ekspor**: Kemampuan ekspor konteks ke PDF/Markdown

---

## DESIGN UI - Halaman "Konteks AI"

> Berdasarkan mockup Figma yang disediakan

### Struktur halaman

```
┌─────────────────────────────────────────────────────────────────┐
│ Sidebar                    │  Konten Utama                      │
│                            │                                     │
│ [Avatar] Mboa Fashion Free │  ⓘ Konteks              [Skor•45%]│
│ +237 657 88 86 90          │                                     │
│                            │  Deskripsi konteks...               │
│ ─────────────────          │                                     │
│ Akun                       │  [Buka semua konten ↗]              │
│   🏠 Beranda               │                                     │
│   📊 Statistik             │  ┌─────────────────────────────┐   │
│   📦 Pesanan               │  │ Perusahaan           [▼]    │   │
│                            │  │ Nama: Mboa Fashion...        │   │
│ ─────────────────          │  └─────────────────────────────┘   │
│ Konfigurasi                │                                     │
│   ⚙️ Konteks AI <-         │  ┌─────────────────────────────┐   │
│   🛒 Katalog               │  │ Pickup               [▼]    │   │
│   📣 Pemasaran             │  │ Alamat untuk pickup...       │   │
│   🎧 Dukungan              │  └─────────────────────────────┘   │
│                            │                                     │
│ ─────────────────          │  ┌─────────────────────────────┐   │
│ Bantuan                    │  │ Pengiriman           [▼]    │   │
│   ❓ FAQ                   │  │ Alamat untuk pickup...       │   │
│   ❓ Dukungan              │  └─────────────────────────────┘   │
│                            │                                     │
│                            │  ┌─────────────────────────────────┐│
│                            │  │ 📎 Apa instruksi Anda? ⬆        ││
│                            │  │ [Dukungan] [Strategi penjualan]  ││
│                            │  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Komponen kunci

#### 1. Badge Skor (pojok kanan atas)
- **Dapat diklik** -> buka popup dengan kebutuhan yang hilang
- **Warna dinamis**:
  - Merah: < 50%
  - Oranye: 50-79%
  - Hijau: >= 80%
- Kontur oranye selama belum dapat diaktifkan

#### 2. Bagian konteks yang dapat dilipat
- Judul + pratinjau konten (terpotong)
- Ikon status: ✓ (lengkap) atau ⚠️ (tidak lengkap)
- Klik -> buka konten Markdown lengkap

#### 3. Input chat (bagian bawah)
- Input: "Apa instruksi Anda?"
- Ikon lampiran (untuk screenshot, dll.)
- Tombol kirim
- **Quick actions**: Tombol untuk aksi sering
  - "Dukungan", "Strategi penjualan", dll.
  - = `potentialReplies` dari rencana kami

#### 4. Tampilan Percakapan (saat chat aktif)
```
┌─────────────────────────────────────┐
│ ⓘ Percakapan inisialisasi          │
│                                     │
│ Deskripsi...                        │
│                                     │
│ ┌─────────────────────────────┐    │
│ │ ⓘ Apakah Anda menyediakan  │    │
│ │    pengiriman?              │    │
│ │                             │    │
│ │ Jika ya, mohon tunjukkan    │    │
│ │ kota mana...                │    │
│ └─────────────────────────────┘    │
│                                     │
│ [Input + Quick actions]             │
└─────────────────────────────────────┘
```

### Popup "Kebutuhan yang hilang" (klik skor)

```
┌─────────────────────────────────────┐
│ ❌  Informasi yang hilang           │
│                                     │
│ Untuk mencapai 80%, hilang:         │
│                                     │
│ 🔴 Prioritas tinggi                 │
│   • Kebijakan harga                 │
│   • Zona pengiriman                 │
│                                     │
│ 🟡 Prioritas sedang                 │
│   • Nomor dukungan                  │
│   • Kebijakan pengembalian          │
│                                     │
│ Skor saat ini: 45% -> Target: 80%   │
│                                     │
│ [Lanjutkan percakapan]              │
└─────────────────────────────────────┘
```

### Navigasi sidebar

| Bagian | Halaman | Deskripsi |
|---------|-------|-------------|
| **Akun** | Beranda, Statistik, Pesanan | Manajemen harian |
| **Konfigurasi** | Konteks AI, Katalog, Pemasaran, Dukungan | Setup sistem |
| **Bantuan** | FAQ, Dukungan | Bantuan |

### Perilaku UX

1. **Blokir aktivasi**: Pengguna TIDAK DAPAT mengaktifkan AI jika skor < 80%
2. **Skor dapat diklik**: Tampilkan popup dengan detail kekurangan
3. **Chat persisten**: Chat tetap di bawah, pesan terlihat di atas
4. **Riwayat**: Scroll untuk melihat pesan sebelumnya
5. **Auto-save**: Konteks disimpan otomatis setelah setiap jawaban

### Keunggulan format Markdown

Format Markdown untuk `contextNeeds` memungkinkan:
- **Transparansi skor**: Pengguna melihat persis apa yang hilang dengan prioritas visual
- **Progres terlihat**: Setiap jawaban, kebutuhan berpindah ke "Selesai"
- **Fleksibilitas**: AI dapat menambah bagian jika menemukan masalah
- **Interaktivitas**: Pengguna dapat berkomentar dan berinteraksi langsung
- **Keterbacaan**: Format manusia, bukan teknis

### Versioning Konteks

```prisma
model AgentContextVersion {
  id        String        @id @default(uuid())
  agentId   String
  agent     WhatsAppAgent @relation(fields: [agentId], references: [id])
  context   String        @db.Text
  score     Int
  reason    String?       // Mengapa versi ini dibuat
  createdAt DateTime      @default(now())

  @@index([agentId])
}
```

### Modifikasi model ProductImage

```prisma
model ProductImage {
  // ... field yang ada ...

  // Field baru
  ia_analyse          String?             @db.Text    // Analisis AI gambar
  analysed_at         DateTime?           // Tanggal analisis
}
```

### Tabel baru: Thread & ThreadMessage

```prisma
model Thread {
  id          String          @id @default(uuid())
  userId      String
  user        User            @relation(fields: [userId], references: [id])
  agentId     String
  agent       WhatsAppAgent   @relation(fields: [agentId], references: [id])
  type        ThreadType      @default(ONBOARDING)
  title       String?
  isActive    Boolean         @default(true)
  messages    ThreadMessage[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([userId])
  @@index([agentId])
}

enum ThreadType {
  ONBOARDING          // Thread onboarding awal
  CONTEXT_IMPROVEMENT // Peningkatan berkelanjutan
  SUPPORT             // Dukungan pengguna
  STRATEGY_CHANGE     // Perubahan strategi
}

model ThreadMessage {
  id              String    @id @default(uuid())
  threadId        String
  thread          Thread    @relation(fields: [threadId], references: [id])
  content         String    @db.Text
  source          MessageSource
  potentialReplies Json?    // [{title: string, action?: string}]
  tokensUsed      Int?
  createdAt       DateTime  @default(now())

  @@index([threadId])
}

enum MessageSource {
  USER
  AGENT
  SYSTEM
}
```

### Checklist Database

- ⬜ Tambah enum OnboardingStatus ke schema Prisma
- ⬜ Tambah enum ThreadType ke schema Prisma
- ⬜ Tambah enum MessageSource ke schema Prisma
- ⬜ Modifikasi model WhatsAppAgent (field baru + relasi)
- ⬜ Modifikasi model ProductImage (ia_analyse)
- ⬜ Buat model Thread
- ⬜ Buat model ThreadMessage
- ⬜ Buat model AgentContextVersion
- ⬜ Buat migrasi Prisma
- ⬜ Perbarui tipe yang dihasilkan

---

## FASE DETAIL

### Fase 1: Koneksi & Sinkronisasi (SYNC_CATALOG)

**Tujuan**: Pengguna menghubungkan WhatsApp-nya dan kami menyinkronkan katalognya.

**Perilaku yang ada yang perlu dimodifikasi**:
- Saat user menjadi `ready` -> set `onboardingStatus = SYNC_CATALOG`
- Akhir upload katalog + info -> lanjut ke `ANALYSE_PRODUCTS`

#### Checklist Fase 1

- ⬜ Modifikasi `auth.service.ts` untuk inisialisasi `onboardingStatus`
- ⬜ Modifikasi `catalog.service.ts` untuk mengubah status setelah sync
- ⬜ Tambah endpoint `GET /onboarding/status` untuk memeriksa status
- ⬜ Frontend: pengalihan sesuai `onboardingStatus`

---

### Fase 2: Analisis Produk (ANALYSE_PRODUCTS)

**Tujuan**: Menganalisis gambar setiap produk dengan AI untuk memperkaya konteks.

**Spesifikasi**:
- Gunakan LangChain di backend
- AI utama: Grok (thinking model)
- Backup: Gemini (fallback otomatis via LangChain)
- **Analisis 2 gambar pertama setiap produk** (optimasi biaya/performa)
- Pemrosesan **batch** dan **latar belakang**
- Simpan analisis di `ProductImage.ia_analyse`
- Jika 2 gambar sudah dianalisis -> skip produk
- Hitung progres real-time
- Error dilaporkan via **Sentry**

**Format analisis**:
```json
{
  "description": "Deskripsi detail apa yang terlihat",
  "product_type": "Tipe produk terdeteksi",
  "colors": ["warna terdeteksi"],
  "materials": ["bahan terlihat"],
  "quality_score": 85,
  "suggestions": ["saran peningkatan gambar"]
}
```

#### Checklist Fase 2

**Backend**:
- ⬜ Buat modul `onboarding`
- ⬜ Buat `ProductAnalysisService`
- ⬜ Integrasikan Grok API (xAI)
- ⬜ Integrasikan Gemini API (backup)
- ⬜ Buat job analisis latar belakang
- ⬜ Endpoint `POST /onboarding/start-product-analysis`
- ⬜ Endpoint `GET /onboarding/analysis-progress`
- ⬜ Logika perhitungan progres
- ⬜ Penanganan error dan retry

**Frontend**:
- ⬜ Buat halaman `/onboarding/analysis`
- ⬜ Komponen `AnalysisProgress` dengan progress bar
- ⬜ Tampilan produk yang dianalisis real-time
- ⬜ Polling atau WebSocket untuk progres

---

### Fase 3: Analisis Perusahaan (ANALYSE_COMPANY)

**Tujuan**: Menghasilkan konteks awal agent berdasarkan semua data yang tersedia.

**Data untuk dikumpulkan**:
- BusinessInfo (profile_name, description, categories, business_hours)
- User (phoneNumber, whatsappProfile)
- Products (name, description, price)
- ProductImages (ia_analyse dari 2 gambar pertama)
- Collections (name, description)

**Output**:
1. `agentContext`: Konteks tekstual lengkap untuk agent
2. `contextScore`: Skor awal (kemungkinan rendah, 20-40%)
3. `contextNeeds`: Daftar terstruktur kebutuhan/pertanyaan untuk meningkatkan skor

**Struktur konteks yang dihasilkan**:
```markdown
## Perusahaan
- Nama: {business_name}
- Deskripsi: {description}
- Kategori: {categories}
- Jam operasional: {business_hours}

## Produk
{Untuk setiap produk:}
- {name}: {description} - {price} FCFA
  Analisis visual: {ia_analyse summary}

## Informasi yang hilang
- Sektor bisnis spesifik
- Kebijakan harga
- Zona pengiriman
- dll.
```

#### Checklist Fase 3

**Backend**:
- ⬜ Buat `CompanyAnalysisService`
- ⬜ Fungsi pengumpulan data
- ⬜ Prompt AI untuk pembuatan konteks
- ⬜ Prompt AI untuk perhitungan skor
- ⬜ Prompt AI untuk saran peningkatan
- ⬜ Endpoint `POST /onboarding/start-company-analysis`
- ⬜ Endpoint `GET /onboarding/context`
- ⬜ Simpan konteks di WhatsappAgent

**Frontend**:
- ⬜ Halaman transisi/loading selama analisis
- ⬜ Tampilan skor awal
- ⬜ Tombol untuk lanjut ke peningkatan

---

### Fase 4: Peningkatan Konteks (CONTEXT_IMPROVEMENT)

**Tujuan**: Chat percakapan di mana AI mengajukan pertanyaan dan meningkatkan konteks hingga skor >= 80%.

**Perilaku**:
- Pengguna diarahkan ke chat
- Komunikasi real-time via **WebSocket**
- AI memiliki akses ke tools untuk:
  - Membaca data di DB
  - Menjalankan skrip via wa-js
  - Memperbarui konteks dan skor
  - Membuat/memodifikasi tag dan grup
  - Menulis dan menjalankan skripnya sendiri
- AI mengajukan pertanyaan yang disesuaikan dengan bisnis
- Setiap jawaban meningkatkan konteks dan mengurangi kebutuhan
- Skor minimum: **80%** (dengan peringatan jika pengguna ingin mengaktifkan sebelumnya)

**Tabel yang digunakan**: Thread, ThreadMessage

**potentialReplies**: Tombol yang ditampilkan di bawah pesan terakhir untuk memudahkan jawaban

**Tes respons AI**: Pengguna dapat menambahkan teman sebagai kontak tes dalam strategi untuk menguji respons langsung via WhatsApp (tidak perlu lingkungan tes terpisah)

#### Pertanyaan per tipe bisnis

**E-commerce / Toko**:
- Harga tetap atau dapat dinegosiasikan? (jika dinegosiasikan: % diskon maks)
- Apakah Anda memiliki toko fisik? (berdasarkan alamat bisnis)
- Apakah Anda melakukan pengiriman? (jika ya: kota + biaya)
- Kebijakan pengembalian? (batas waktu maks)
- Nomor dukungan klien?
- Metode pembayaran yang diterima?

**Layanan**:
- Tipe layanan?
- Zona cakupan?
- Rata-rata waktu layanan?
- Tarif (per jam, paket, penawaran)?

**Umum (semua)**:
- Sektor bisnis spesifik
- **Percakapan pribadi**: Sarankan membuat tag "Pribadi" (akun bisnis) atau menambahkan kontak pribadi di dashboard
- Tag untuk dibuat (Klien untuk ditindaklanjuti, Klien baru, Dukungan, Pribadi...)
- Grup untuk dibuat (Pengiriman, Tim, dll.)

#### Sistem Tools AI

AI memiliki set lengkap tools untuk menjadi **otonom** dan dapat mengorkestrasi aksinya sendiri.

##### Tools Database

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `readUserInfo` | Baca info pengguna | userId |
| `readBusinessProfile` | Baca profil bisnis | userId |
| `readProducts` | Baca produk | userId, limit?, offset? |
| `readProductAnalysis` | Baca analisis gambar | productId |
| `readTags` | Baca tag pengguna (DB) | userId |
| `readGroups` | Baca grup pengguna (DB) | userId |
| `updateContext` | Perbarui konteks agent | newContext |
| `updateNeeds` | Perbarui kebutuhan | needs[] |
| `getContextScore` | Dapatkan skor saat ini | - |

##### Tools Labels/Tags (via wa-js WPP.labels)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getAllLabels` | Daftar semua label WhatsApp | - |
| `getLabelById` | Dapatkan label spesifik | labelId |
| `addNewLabel` | Buat label baru | name, color? |
| `editLabel` | Modifikasi label | labelId, name?, color? |
| `deleteLabel` | Hapus label | labelId |
| `addOrRemoveLabels` | Tambah/hapus label dari chat | chatId, labelIds[], action |
| `getLabelColorPalette` | Dapatkan warna yang tersedia | - |

##### Tools Chat/Pesan (via wa-js WPP.chat)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getChatList` | Daftar percakapan | limit?, filters? |
| `getChat` | Dapatkan detail chat | chatId |
| `getMessages` | Baca pesan percakapan | chatId, limit? |
| `getUnreadChats` | Daftar chat belum dibaca | - |
| `markIsRead` | Tandai sebagai dibaca | chatId |
| `archiveChat` | Arsipkan percakapan | chatId |
| `pinChat` | Sematkan percakapan | chatId |
| `getNotes` | Baca catatan chat | chatId |
| `setNotes` | Atur catatan chat | chatId, notes |

##### Tools Kontak (via wa-js WPP.contact)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getContact` | Dapatkan info kontak | contactId |
| `getContactList` | Daftar semua kontak | filters? |
| `getContactStatus` | Baca status kontak | contactId |
| `getCommonGroups` | Grup bersama | contactId |
| `queryContactExists` | Verifikasi kontak ada | phoneNumber |

##### Tools Grup WhatsApp (via wa-js WPP.group)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getAllGroups` | Daftar semua grup WA | - |
| `createGroup` | Buat grup WA | name, participants[] |
| `getGroupParticipants` | Daftar anggota grup | groupId |
| `addGroupParticipants` | Tambah anggota | groupId, participants[] |
| `removeGroupParticipants` | Hapus anggota | groupId, participants[] |
| `setGroupSubject` | Ubah nama grup | groupId, subject |
| `setGroupDescription` | Ubah deskripsi | groupId, description |
| `getGroupInviteCode` | Dapatkan link undangan | groupId |

##### Tools Profil (via wa-js WPP.profile)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getMyProfileName` | Baca nama profil | - |
| `getMyStatus` | Baca status WhatsApp | - |
| `setMyProfileName` | Modifikasi nama profil | name |
| `setMyStatus` | Modifikasi status WhatsApp | status |
| `editBusinessProfile` | Modifikasi profil bisnis | data |

##### Tools Katalog (via wa-js WPP.catalog)

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `getProducts` | Daftar produk katalog | limit? |
| `getProductById` | Dapatkan produk | productId |
| `editProduct` | Modifikasi produk | productId, data |
| `getCollections` | Daftar koleksi | - |
| `editCollection` | Modifikasi koleksi | collectionId, data |
| `setProductVisibility` | Tampilkan/sembunyikan produk | productId, visible |

##### Tools Lanjutan

| Tool | Deskripsi | Parameter |
|------|-------------|------------|
| `executeScript` | Jalankan skrip wa-js custom | script |
| `sendMessage` | Kirim pesan (untuk tes) | chatId, message |

#### Mekanisme Orkestrasi (ReAct Agent)

AI menggunakan pola **ReAct** (Reasoning + Acting) dari LangChain untuk mengorkestrasi aksinya secara otonom:

```typescript
// AI dapat merangkai beberapa tools secara otomatis
const agent = createReactAgent({
  llm: grokClient,
  tools: allTools,
  prompt: orchestrationPrompt,
});

// Contoh penalaran AI:
// 1. "Saya harus memeriksa apakah pengguna memiliki label"
// 2. Panggilan: getAllLabels()
// 3. "Tidak ada label 'Klien baru', saya akan membuatnya"
// 4. Panggilan: addNewLabel("Klien baru", "#4CAF50")
// 5. "Saya perbarui konteks dengan info ini"
// 6. Panggilan: updateContext(newContext)
// 7. "Saya hitung ulang skor"
// 8. Panggilan: updateNeeds(updatedNeeds)
```

**Kemampuan orkestrasi**:
- Merangkai beberapa tools tanpa intervensi pengguna
- Menggunakan hasil satu tool untuk menentukan yang berikutnya
- Menyimpan konteks otomatis setelah modifikasi
- Mendeteksi dan memperbaiki error (salah eja dalam produk, dll.)
- Mengusulkan peningkatan proaktif

**Keamanan**:
- Skrip custom di-sandbox dengan timeout
- Whitelist fungsi wa-js yang diizinkan
- Logging semua operasi
- Kemampuan review admin

#### Prompt sistem untuk AI chat

```markdown
Anda adalah asisten onboarding untuk WhatsApp Agent. Peran Anda adalah membantu pengguna mengonfigurasi agent AI-nya agar dapat merespons klien secara otomatis.

## Tujuan Anda
Tingkatkan konteks agent hingga mencapai skor minimum 80%. Skor saat ini adalah {score}%.

## Apa yang sudah Anda tahu
{agentContext}

## Kebutuhan yang tersisa
{contextNeeds}

## Aturan
1. Ajukan SATU pertanyaan pada satu waktu
2. Sesuaikan pertanyaan dengan tipe bisnis yang terdeteksi
3. Gunakan tools yang tersedia untuk mendapatkan info lebih bila perlu
4. Anda dapat merangkai beberapa tools untuk menyelesaikan tugas (mis: periksa label -> buat jika hilang -> perbarui konteks)
5. Setelah setiap jawaban pengguna, perbarui konteks DAN kebutuhan
6. Sarankan tombol jawaban cepat (potentialReplies) saat relevan
7. Anda dapat membuat tag dan grup jika pengguna mau
8. Jika Anda mendeteksi error (salah eja, info tidak koheren), sarankan untuk memperbaiki
9. Jika skor mencapai 80%, selamatkan pengguna dan sarankan untuk lanjut ke langkah berikutnya
10. Anda dapat menambah kebutuhan jika menemukan info penting yang hilang

## Format respons
- Bersikap ringkas dan profesional
- Gunakan potentialReplies untuk pilihan sederhana
- Jelaskan mengapa setiap informasi penting
- Tampilkan progres (mis: "Skor: 65% -> 72% (+7)")
```

#### Checklist Fase 4

**Backend**:
- ⬜ Buat modul `threads`
- ⬜ Buat `ThreadService`
- ⬜ Buat `ContextImprovementService`
- ⬜ Implementasikan semua tools AI
- ⬜ Buat prompt sistem detail
- ⬜ Endpoint `POST /threads` - Buat thread
- ⬜ Endpoint `GET /threads/:id` - Dapatkan thread
- ⬜ Endpoint `GET /threads/:id/messages` - Daftar pesan
- ⬜ Endpoint `POST /threads/:id/messages` - Kirim pesan
- ⬜ Logika perhitungan skor dinamis
- ⬜ Integrasi LangChain dengan tools

**Frontend**:
- ⬜ Buat halaman `/onboarding/context-chat`
- ⬜ Komponen `ChatInterface`
- ⬜ Tampilkan pesan dengan bubble
- ⬜ Tombol `potentialReplies` di bawah pesan terakhir
- ⬜ Indikator skor real-time
- ⬜ Tombol "Lanjut ke langkah berikutnya" saat skor >= 80%
- ⬜ Peringatan jika aktivasi dengan skor < 80%
- ⬜ Kemampuan melanjutkan chat bahkan setelah 80%

---

### Fase 5: Pemilihan Strategi (STRATEGY_SELECTION)

**Tujuan**: Pengguna memilih cara mengaktifkan sistem.

**Opsi (Kartu)**:

#### Opsi 1: Mode Tes
- Pilih satu atau beberapa nomor telepon
- Sistem hanya merespons pesan dari nomor-nomor ini
- Untuk tes sebelum aktivasi global

#### Opsi 2: Tag Spesifik
- Aktifkan untuk percakapan yang ditag
- Pilih tag yang terkait (autocomplete)
- Berguna untuk menargetkan klien tertentu

#### Opsi 3: Semua Kontak
- Aktivasi global
- Nonaktifkan opsi 1 dan 2
- Sistem merespons semua pesan

**Penyimpanan**:
```typescript
// WhatsappAgent.activationStrategy
{
  type: 'test' | 'tags' | 'all',
  phoneNumbers?: string[],  // Untuk tipe 'test'
  tagIds?: string[]         // Untuk tipe 'tags'
}
```

#### Checklist Fase 5

**Backend**:
- ⬜ Endpoint `GET /onboarding/tags` - Daftar tag untuk autocomplete
- ⬜ Endpoint `POST /onboarding/strategy` - Simpan strategi
- ⬜ Endpoint `GET /onboarding/strategy` - Dapatkan strategi saat ini
- ⬜ Validasi data (nomor valid, tag ada)

**Frontend**:
- ⬜ Buat halaman `/onboarding/activation`
- ⬜ Kartu "Mode Tes" dengan input nomor
- ⬜ Kartu "Tag Spesifik" dengan autocomplete
- ⬜ Kartu "Semua Kontak" dengan konfirmasi
- ⬜ Indikasi visual opsi yang dipilih
- ⬜ Tombol "Aktifkan sistem"

---

### Fase 6: Sistem Aktif (ACTIVE)

**Tujuan**: Sistem operasional dan memproses pesan sesuai strategi.

**Flow pemrosesan pesan**:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Connector  │────>│   Backend    │────>│    Agent    │
│  (message)  │     │  (webhook)   │     │  (process)  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Periksa     │
                    │  strategi    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌────────┐  ┌──────────┐  ┌────────┐
         │  Tes   │  │   Tags   │  │  All   │
         │ phones │  │ matching │  │        │
         └────┬───┘  └────┬─────┘  └───┬────┘
              │           │            │
              └───────────┼────────────┘
                          ▼
                   ┌──────────────┐
                   │  Izinkan?    │
                   └──────┬───────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
               ┌────────┐  ┌────────┐
               │  Ya    │  │ Tidak  │
               │Proses  │  │ Ignore │
               └────────┘  └────────┘
```

**Logging operasi**:
Setiap operasi AI harus mencatat:
- Pesan awal
- Pesan akhir (respons yang dihasilkan)
- Token yang digunakan
- Biaya dalam kredit

**Tabel Credit yang ada** akan digunakan untuk melacak penggunaan.

#### Checklist Fase 6

**Backend**:
- ⬜ Modifikasi webhook message untuk memeriksa strategi
- ⬜ Endpoint `POST /agent/can-process` - Verifikasi izin
- ⬜ Service verifikasi strategi
- ⬜ Logging operasi AI
- ⬜ Perhitungan dan pemotongan kredit
- ⬜ Endpoint `GET /usage/stats` - Statistik penggunaan

**Agent (whatsapp-agent)**:
- ⬜ Panggil backend sebelum pemrosesan
- ⬜ Gunakan konteks agent
- ⬜ Catat operasi setelah respons

---

### Fase 7: Dashboard Pengguna

**Tujuan**: Antarmuka post-onboarding untuk mengelola sistem.

#### Halaman beranda

**Kartu aktivasi skenario**:
- Aktifkan/nonaktifkan sistem
- Ubah strategi
- Mode maintenance

**Kartu utilitas**:
- "Laporkan masalah" -> buka thread dukungan
- "Ubah strategi penjualan" -> thread peningkatan
- "Tingkatkan konteks" -> thread konteks

**Status**:
- Percakapan diproses (total)
- Pesan diproses (total)
- Kredit digunakan
- Kredit tersisa
- Tombol "Upgrade"

#### Daftar percakapan

- Daftar semua thread (onboarding termasuk)
- Kemampuan memulai yang baru
- Filter per tipe (ONBOARDING, SUPPORT, dll.)

#### Pengaturan

- Profil pengguna
- Informasi bisnis
- Konfigurasi lanjutan

#### Checklist Fase 7

**Backend**:
- ⬜ Endpoint `GET /dashboard/stats` - Statistik
- ⬜ Endpoint `GET /threads` - Daftar thread pengguna
- ⬜ Endpoint `POST /threads/start/:type` - Mulai thread

**Frontend**:
- ⬜ Buat halaman `/dashboard`
- ⬜ Komponen `StatsCards`
- ⬜ Komponen `ActionCards`
- ⬜ Buat halaman `/conversations`
- ⬜ Daftar thread dengan pratinjau
- ⬜ Buat halaman `/settings`
- ⬜ Navigasi bottom bar

---

## STRUKTUR BACKEND

### Modul baru untuk dibuat

```
src/
├── onboarding/
│   ├── onboarding.module.ts
│   ├── onboarding.controller.ts
│   ├── onboarding.service.ts
│   ├── product-analysis.service.ts
│   ├── company-analysis.service.ts
│   └── dto/
│       ├── start-analysis.dto.ts
│       └── set-strategy.dto.ts
├── threads/
│   ├── threads.module.ts
│   ├── threads.controller.ts
│   ├── threads.service.ts
│   ├── context-improvement.service.ts
│   ├── tools/
│   │   ├── index.ts
│   │   ├── read-user.tool.ts
│   │   ├── read-products.tool.ts
│   │   ├── create-tag.tool.ts
│   │   ├── execute-script.tool.ts
│   │   └── update-context.tool.ts
│   └── dto/
│       ├── create-thread.dto.ts
│       └── send-message.dto.ts
└── dashboard/
    ├── dashboard.module.ts
    ├── dashboard.controller.ts
    └── dashboard.service.ts
```

---

## STRUKTUR FRONTEND

### Route baru

```typescript
// routes.ts
export default [
  // ... route yang ada ...

  // Onboarding diperluas
  { path: '/onboarding/analysis', component: OnboardingAnalysis },
  { path: '/onboarding/context-chat', component: ContextChat },
  { path: '/onboarding/activation', component: ActivationStrategy },

  // Dashboard
  { path: '/dashboard', component: Dashboard },
  { path: '/conversations', component: Conversations },
  { path: '/conversations/:threadId', component: ThreadDetail },
  { path: '/settings', component: Settings },
]
```

### Komponen baru

```
app/
├── components/
│   ├── onboarding/
│   │   ├── AnalysisProgress.tsx
│   │   └── ScoreIndicator.tsx
│   ├── chat/
│   │   ├── ChatInterface.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── PotentialReplies.tsx
│   │   └── ChatInput.tsx
│   ├── dashboard/
│   │   ├── StatsCards.tsx
│   │   ├── ActionCards.tsx
│   │   └── QuickActions.tsx
│   └── strategy/
│       ├── TestModeCard.tsx
│       ├── TagsCard.tsx
│       └── AllContactsCard.tsx
```

---

## INTEGRASI AI

### Provider untuk dikonfigurasi

**Grok (xAI)** - Utama untuk analisis:
```typescript
// Thinking model untuk analisis mendalam
const grokClient = new XAI({
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-2-vision-1212', // atau thinking model
});
```

**Gemini** - Backup:
```typescript
const geminiClient = new GoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
  model: 'gemini-1.5-flash',
});
```

### Konfigurasi LangChain

```typescript
// Untuk chat peningkatan
const agent = createReactAgent({
  llm: grokClient, // atau gemini sebagai fallback
  tools: [
    readUserInfoTool,
    readProductsTool,
    createTagTool,
    updateContextTool,
    // ... tool lainnya
  ],
  prompt: contextImprovementPrompt,
});
```

---

## ENDPOINT API BARU

### Onboarding

| Method | Endpoint | Deskripsi |
|--------|----------|-------------|
| GET | `/onboarding/status` | Dapatkan status onboarding saat ini |
| POST | `/onboarding/start-product-analysis` | Jalankan analisis produk |
| GET | `/onboarding/analysis-progress` | Progres analisis |
| POST | `/onboarding/start-company-analysis` | Jalankan analisis perusahaan |
| GET | `/onboarding/context` | Dapatkan konteks yang dihasilkan |
| POST | `/onboarding/strategy` | Tetapkan strategi aktivasi |
| GET | `/onboarding/strategy` | Dapatkan strategi saat ini |

### Threads

| Method | Endpoint | Deskripsi |
|--------|----------|-------------|
| GET | `/threads` | Daftar thread pengguna |
| POST | `/threads` | Buat thread baru |
| GET | `/threads/:id` | Detail thread |
| GET | `/threads/:id/messages` | Pesan thread |
| POST | `/threads/:id/messages` | Kirim pesan |

### Dashboard

| Method | Endpoint | Deskripsi |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Statistik pengguna |
| GET | `/usage/history` | Riwayat penggunaan |

### Agent

| Method | Endpoint | Deskripsi |
|--------|----------|-------------|
| POST | `/agent/can-process` | Periksa apakah boleh memproses pesan |
| POST | `/agent/log-operation` | Catat operasi AI |

---

## CHANGELOG

### [2025-11-20] - Revisi besar rencana
- Klarifikasi UX: 3-4 langkah pengguna (bukan 6+)
- Skor minimum diubah dari 90% ke **80%** dengan peringatan
- Analisis gambar: 2 per produk (bukan 4) secara batch
- **Format Markdown** untuk agentContext dan contextNeeds
  - Memungkinkan render kaya di UI
  - Komentar inline pada bagian (hover)
  - Bagian dapat dilipat/dibuka
  - Checkbox interaktif
- Tambah **versioning konteks** (AgentContextVersion)
- Ekspansi besar tools AI (50+ tools berbasis wa-js)
- Dokumentasi mekanisme **orkestrasi ReAct**
- Tambah deteksi percakapan pribadi via tag
- Komunikasi chat via **WebSocket**
- Klarifikasi UserStatus vs OnboardingStatus
- Tes respons via WhatsApp (tidak perlu env tes terpisah)
- Tambah Sentry untuk monitoring error
- Fallback Grok -> Gemini via LangChain
- **Dokumentasi design UI** berdasarkan mockup Figma:
  - Struktur halaman "Konteks AI"
  - Badge skor dapat diklik -> popup kebutuhan hilang
  - Bagian dapat dilipat dengan pratinjau
  - Input chat persisten dengan quick actions
  - Navigasi sidebar (Akun/Konfigurasi/Bantuan)

### [2025-11-20] - Pembuatan rencana
- Pembuatan awal file ONBOARDING_PLAN.md
- Dokumentasi lengkap semua fase
- Definisi struktur data
- Listing endpoint API
- Checklist untuk setiap fase

---

## CATATAN SESI

### Keputusan teknis

**[2025-11-20]**:
- Skor 80% dipilih untuk menyeimbangkan kualitas dan friksi pengguna
- 2 gambar per produk untuk optimasi biaya/performa
- contextNeeds sebagai JSON untuk fleksibilitas dan transparansi
- Pola ReAct agent untuk memungkinkan orkestrasi otonom
- WebSocket untuk chat real-time
- Tes via WhatsApp langsung (bukan simulator)
- Tag untuk percakapan pribadi (lebih andal daripada deteksi otomatis)

### Blocker yang ditemui

*(Akan dilengkapi seiring waktu)*

### Langkah berikutnya segera

1. Modifikasi schema Prisma dengan enum dan tabel baru
2. Buat migrasi
3. Mulai dengan modul `onboarding` backend
4. Implementasikan analisis produk dengan Grok/Gemini
5. Konfigurasi WebSocket untuk chat
6. Buat skrip wa-js untuk tools baru

---

## SUMBER DAYA

- [Dokumentasi wa-js](https://wppconnect.io/wa-js/) - Untuk skrip WhatsApp
- [LangChain Tools](https://js.langchain.com/docs/modules/agents/tools/) - Untuk tools AI
- [Grok API](https://docs.x.ai/) - Dokumentasi xAI
- [Gemini API](https://ai.google.dev/docs) - Dokumentasi Google AI
