# Monorepo

Monorepo pnpm modern yang berisi aplikasi frontend dan backend dengan package bersama.

## Struktur Proyek

```
monorepo/
├── apps/
│   ├── frontend/          # Aplikasi React Router v7
│   └── backend/           # Backend NestJS + Prisma + Swagger
├── packages/
│   └── common/            # Enum, konstanta, dan utilitas bersama
├── package.json           # Konfigurasi workspace root
├── pnpm-workspace.yaml    # Definisi workspace pnpm
├── docker-compose.yml     # Lingkungan pengembangan
└── README.md             # File ini
```

## Memulai

### Prasyarat

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

### Instalasi

1. Pasang dependensi:

```bash
pnpm install
```

2. Atur variabel lingkungan:

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit file .env dengan konfigurasi Anda
# Database: app_db, User: app_user, Password: (atur sendiri)
```

3. Jalankan lingkungan pengembangan:

```bash
# Opsi 1: Menggunakan Docker (Disarankan)
docker compose up

# Generate migrasi
docker exec apps-backend pnpx prisma@6.16.2 migrate dev --name [nama-migrasi]

# Jalankan migrasi database (di dalam container Docker)
docker exec apps-backend pnpx prisma@6.16.2 migrate deploy

# Jalankan server pengembangan frontend (lokal)
pnpm --filter frontend run dev
```

### Layanan

- **Backend**: http://localhost:3005
- **Dokumentasi API**: http://localhost:3005/api
- **Database**: PostgreSQL pada port 5432
- **Frontend**: http://localhost:5173 (saat dijalankan secara lokal)

## Arsitektur

### Frontend (apps/frontend)

- **Framework**: React Router v7
- **Bahasa**: TypeScript
- **Styling**: Tailwind CSS dan Ant Design
- **State Management**: React Query/SWR untuk state server
- **Build Tool**: Vite

### Backend (apps/backend)

- **Framework**: NestJS
- **Database**: PostgreSQL dengan Prisma ORM
- **Dokumentasi API**: Swagger/OpenAPI
- **Autentikasi**: Autentikasi berbasis JWT dengan Passport
- **Validasi**: Class-validator dengan DTO
- **Email**: Integrasi Nodemailer untuk email transaksional
- **Health Checks**: Terminus untuk pemantauan kesehatan layanan
- **Internasionalisasi**: Dukungan i18n dengan terjemahan Indonesia
- **Modul**: Auth, Users, Email, Health, Prisma, i18n

### Package Bersama (packages/common)

- **Tipe**: Interface dan tipe TypeScript bersama
- **Enum**: Enumerasi umum
- **Konstanta**: Konstanta tingkat aplikasi
- **Utilitas**: Fungsi utilitas bersama

## Kualitas Kode

Proyek ini menggunakan konfigurasi bersama untuk:

- **ESLint**: Linting kode yang konsisten di semua package
- **Prettier**: Format kode
- **TypeScript**: Pemeriksaan tipe dan kompilasi
