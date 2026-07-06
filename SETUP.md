# Panduan Konfigurasi - Platform WhatsApp Agent

## Prasyarat

- Node.js 18+ dan pnpm 10+
- PostgreSQL 14+
- Redis 6+
- Akun API Grok (xAI) atau Gemini (Google)

## Instalasi Cepat

### 1. Pasang dependensi

```bash
pnpm install
```

### 2. Konfigurasi database

Buat database PostgreSQL:

```bash
createdb whatsapp_agent
```

### 3. Konfigurasi variabel lingkungan

#### Backend

```bash
cd apps/backend
cp .env.example .env
```

Edit `.env` dan konfigurasikan:

- `DATABASE_URL`: URL koneksi PostgreSQL
- `REDIS_URL`: URL koneksi Redis
- `JWT_SECRET`: Kunci rahasia untuk JWT (hasilkan kunci acak)
- `ENCRYPTION_KEY`: Kunci enkripsi (32 karakter)

#### WhatsApp Connector

```bash
cd apps/whatsapp-connector
cp .env.example .env
```

Pastikan URL sesuai dengan layanan lokal.

#### WhatsApp Agent

```bash
cd apps/whatsapp-agent
cp .env.example .env
```

Edit `.env` dan tambahkan:

- `GROK_API_KEY`: Kunci API xAI Anda (atau Gemini)

#### Frontend

```bash
cd apps/frontend
cp .env.example .env
```

Default: `VITE_API_URL=http://localhost:3000`

### 4. Inisialisasi database

```bash
cd apps/backend
pnpm prisma:migrate   # Terapkan migrasi
pnpm prisma:seed      # Impor data uji
```

### 5. Jalankan semua layanan

```bash
# Di root proyek
pnpm dev:all
```

Perintah ini menjalankan:

- **Backend** di http://localhost:3000
- **Frontend** di http://localhost:5173
- **WhatsApp Connector** di http://localhost:3001
- **WhatsApp Agent** di http://localhost:3002

## Dokumentasi API

- Swagger Backend: http://localhost:3000/api
- Swagger Connector: http://localhost:3001/api
- Swagger Agent: http://localhost:3002/api

## Data Uji

Setelah seeding, Anda dapat masuk dengan:

- **Telepon**: +33612345678
- **Email**: test@example.com
- **Kredit**: 1000

## Skrip Tersedia

```bash
# Pengembangan
pnpm dev              # Backend + Frontend saja
pnpm dev:all          # Semua layanan
pnpm dev:backend      # Backend saja
pnpm dev:frontend     # Frontend saja
pnpm dev:whatsapp     # Connector + Agent

# Build
pnpm build            # Build semua layanan
pnpm build:backend    # Build backend saja
pnpm build:frontend   # Build frontend saja

# Database
cd apps/backend
pnpm prisma:migrate   # Membuat/menerapkan migrasi
pnpm prisma:seed      # Seeding
pnpm prisma:studio    # Antarmuka grafis Prisma
pnpm db:reset         # Reset penuh (perhatian: data dihapus)

# Tes
pnpm lint:all         # Linting + Type-check
pnpm type-check       # Type-check TypeScript
```

## Autentikasi

### Pengguna pertama (Pairing WhatsApp)

1. Buka http://localhost:5173/auth/login
2. Masukkan nomor WhatsApp
3. Sistem menghasilkan kode pairing 8 digit
4. Buka WhatsApp > Pengaturan > Perangkat terhubung > Hubungkan dengan nomor
5. Masukkan kode
6. Setelah terhubung, Anda akan diarahkan ke onboarding

### Pengguna yang sudah ada (OTP)

1. Buka http://localhost:5173/auth/verify-otp
2. Sistem mengirim kode 6 digit melalui WhatsApp
3. Masukkan kode untuk masuk

## Arsitektur

```
┌─────────────┐      ┌──────────────────┐      ┌────────────────┐
│   Frontend  │─────▶│     Backend      │◀────▶│   PostgreSQL   │
│  (React v7) │      │    (NestJS)      │      │    + Redis     │
└─────────────┘      └──────────────────┘      └────────────────┘
                              │
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
            ┌──────────────┐   ┌──────────────┐
            │   WhatsApp   │   │   WhatsApp   │
            │   Connector  │──▶│     Agent    │
            │  (wwebjs)    │   │  (LangChain) │
            └──────────────┘   └──────────────┘
```

## Catatan Penting

- **JANGAN PERNAH** menggunakan `prisma db push` di produksi, hanya migrasi
- Connector WhatsApp menyimpan sesi di `./data/sessions`
- Agent menggunakan Grok secara default, dengan fallback ke Gemini
- Di dev, agent lokal dibuat otomatis (localhost:3002)

## Pemecahan Masalah

### Migrasi gagal

```bash
cd apps/backend
pnpm db:reset  # Perhatian: Menghapus semua data
```

### WhatsApp tidak terhubung

1. Hapus `./data/sessions` di whatsapp-connector
2. Mulai ulang connector
3. Pindai QR code baru

### Frontend tidak menemukan API

Pastikan `VITE_API_URL` di `apps/frontend/.env` sesuai dengan backend.

## Dukungan

Untuk pertanyaan apa pun, lihat PLAN.md atau README spesifik dari setiap layanan.
