# Rencana Pengembangan - Alat Balasan Otomatis Pesan Media Sosial

## Gambaran Umum Proyek

Pengembangan sistem balasan otomatis multi-platform menggunakan AI untuk mengelola
percakapan di WhatsApp, Messenger, dan Instagram. Sistem ini berbasis arsitektur
terdistribusi dengan server pusat untuk manajemen dan server klien untuk hosting
instance WhatsApp.

### Tujuan Utama

- Balasan otomatis cerdas melalui LangChain
- Arsitektur skalabel dan terisolasi untuk membatasi risiko pemblokiran
- Manajemen terpusat pengguna, langganan, dan kredit
- Deployment dinamis instance klien
- Sistem penagihan berbasis penggunaan token

---

## Arsitektur Teknis

### 1. Server Pusat (apps/backend + apps/frontend)

**Tanggung Jawab:**

- Manajemen pengguna dan autentikasi
- Dashboard dan situs vitrin
- Manajemen langganan dan kredit
- Penerimaan dan penyimpanan metrik
- Orkestrasi server klien (API Contabo + SSH + Docker Swarm)
- Kontrol otorisasi pemrosesan
- Penagihan dan pemotongan kredit

**Stack Teknis:**

- Backend: NestJS (ada)
- Frontend: React Router v7 (ada)
- Database: PostgreSQL via Prisma
- Cache: Redis
- API: REST + Swagger

### 2. Mikroservis WhatsApp

#### 2.1. whatsapp-connector (apps/whatsapp-connector)

**Tanggung Jawab:**

- Koneksi dan menjaga klien WhatsApp via wwebjs.dev
- Menyediakan endpoint HTTP untuk mengirim pesan
- Penerimaan pesan masuk
- Pengiriman pesan via webhook ke whatsapp-agent
- Pengelolaan QR code dan status koneksi
- Meminimalkan update untuk menjamin stabilitas

**Titik Integrasi:**

- Menerima permintaan kirim pesan via HTTP (dari whatsapp-agent)
- Mengirim pesan yang diterima via webhook (ke whatsapp-agent)

**Stack Teknis:**

- Framework: NestJS
- Library WhatsApp: wwebjs.dev
- Komunikasi: HTTP + Webhook

**Konfigurasi (.env):**

```
PORT=3001
AGENT_WEBHOOK_URL=http://whatsapp-agent:3002/webhook/message
WHATSAPP_SESSION_PATH=/data/sessions
```

**Endpoint yang disediakan:**

- `POST /send` - Kirim pesan
- `POST /send-media` - Kirim media
- `GET /status` - Status koneksi
- `GET /qr` - Ambil QR code
- `GET /contacts` - Daftar kontak
- `GET /chats` - Daftar percakapan
- `POST /mark-read` - Tandai sebagai dibaca
- `GET /health` - Health check

#### 2.2. whatsapp-agent (apps/whatsapp-agent)

**Tanggung Jawab:**

- Penerimaan pesan via webhook (dari whatsapp-connector)
- Analisis dan pembuatan balasan via LangChain
- Verifikasi kredit dengan server pusat
- Pelaporan penggunaan token
- Pengiriman balasan via HTTP ke connector

**Titik Integrasi:**

- Menerima pesan via webhook (dari whatsapp-connector)
- Mengirim balasan via HTTP (ke whatsapp-connector)
- Memeriksa kredit dan melaporkan penggunaan (ke server pusat)

**Stack Teknis:**

- Framework: NestJS
- AI: LangChain + OpenAI/Anthropic
- Komunikasi: HTTP + Webhook

**Konfigurasi (.env):**

```
PORT=3002
CONNECTOR_URL=http://whatsapp-connector:3001
CENTRAL_SERVER_URL=https://central.example.com
CLIENT_ID=unique-client-id
CLIENT_SECRET=secret-key
OPENAI_API_KEY=sk-...
```

**Endpoint yang disediakan:**

- `POST /webhook/message` - Penerimaan pesan
- `GET /health` - Health check

### 3. Mikroservis Messenger dan Instagram

#### 3.1. messenger-agent (apps/messenger-agent)

**Tanggung Jawab:**

- Integrasi dengan API Messenger dari Meta
- Penerimaan webhook Messenger
- Pembuatan balasan via LangChain
- Verifikasi kredit dan pelaporan

**Stack Teknis:**

- Framework: NestJS
- API: Meta Messenger Platform
- AI: LangChain

**Konfigurasi (.env):**

```
PORT=3003
META_APP_ID=...
META_APP_SECRET=...
META_PAGE_ACCESS_TOKEN=...
META_VERIFY_TOKEN=...
CENTRAL_SERVER_URL=https://central.example.com
OPENAI_API_KEY=sk-...
```

#### 3.2. instagram-agent (apps/instagram-agent)

**Tanggung Jawab:**

- Integrasi dengan API Instagram Messaging
- Penerimaan webhook Instagram
- Pembuatan balasan via LangChain
- Verifikasi kredit dan pelaporan

**Stack Teknis:**

- Framework: NestJS
- API: Instagram Graph API
- AI: LangChain

**Konfigurasi (.env):**

```
PORT=3004
META_APP_ID=...
META_APP_SECRET=...
INSTAGRAM_ACCESS_TOKEN=...
META_VERIFY_TOKEN=...
CENTRAL_SERVER_URL=https://central.example.com
OPENAI_API_KEY=sk-...
```

### 4. Server Klien

**Komposisi:**

- 1 instance whatsapp-connector + 1 instance whatsapp-agent = 1 stack klien
- Maksimum 3 stack per server
- Deployment via Docker Swarm

**Tanggung Jawab:**

- Hosting klien WhatsApp terisolasi
- Isolasi IP untuk mengurangi risiko pemblokiran
- Komunikasi dengan server pusat

---

## Alur Komunikasi

### Flow WhatsApp - Pesan Masuk

```
WhatsApp → wwebjs → whatsapp-connector → [webhook] → whatsapp-agent
                                                           ↓
                                                    [Verifikasi kredit]
                                                           ↓
                                                    server pusat
                                                           ↓
                                                    [Otorisasi OK]
                                                           ↓
                                                    [Analisis LangChain]
                                                           ↓
whatsapp-connector ← [HTTP POST /send] ← whatsapp-agent
        ↓
    WhatsApp
        ↓
[Laporan penggunaan] → server pusat → [Pemotongan kredit]
```

### Flow Messenger/Instagram - Pesan Masuk

```
Messenger/Instagram → [Webhook] → messenger/instagram-agent
                                           ↓
                                   [Verifikasi kredit]
                                           ↓
                                   server pusat
                                           ↓
                                   [Otorisasi OK]
                                           ↓
                                   [Analisis LangChain]
                                           ↓
                                   [Balasan API Meta]
                                           ↓
                                   Messenger/Instagram
                                           ↓
                            [Laporan penggunaan] → server pusat
```

---

## Struktur Monorepo

```
whatsapp-agent/
├── apps/
│   ├── backend/                 # Server pusat (ada)
│   ├── frontend/                # Dashboard & situs vitrin (ada)
│   ├── whatsapp-connector/      # Connector WhatsApp
│   ├── whatsapp-agent/          # Agent WhatsApp
│   ├── messenger-agent/         # Agent Messenger
│   └── instagram-agent/         # Agent Instagram
├── packages/
│   └── common/                  # Kode bersama
├── docker/
│   ├── whatsapp-stack.yml       # Stack Docker untuk WhatsApp
│   ├── central.yml              # Stack server pusat
│   └── agents.yml               # Stack agent Messenger/Instagram
├── scripts/
│   ├── deploy-client.sh         # Skrip deployment klien
│   └── provision-vps.sh         # Skrip provisioning VPS
├── PLAN.md                      # Dokumen ini
├── package.json
└── pnpm-workspace.yaml
```

---

## Fase Pengembangan

### Fase 1: Fondasi WhatsApp (PRIORITAS)

#### 1.1. Pembuatan whatsapp-connector

- [ ] Inisialisasi app NestJS berbasis apps/backend
- [ ] Integrasi wwebjs.dev
- [ ] Implementasi manajemen sesi dan QR code
- [ ] Buat endpoint HTTP (send, status, qr, dll.)
- [ ] Implementasi sistem webhook keluar
- [ ] Tambahkan manajemen media
- [ ] Tes dan dokumentasi Swagger

#### 1.2. Pembuatan whatsapp-agent

- [ ] Inisialisasi app NestJS berbasis apps/backend
- [ ] Integrasi LangChain (OpenAI/Anthropic)
- [ ] Buat webhook masuk (penerimaan pesan)
- [ ] Implementasi logika verifikasi kredit
- [ ] Implementasi sistem pembuatan balasan
- [ ] Buat klien HTTP untuk berkomunikasi dengan connector
- [ ] Implementasi pelaporan penggunaan
- [ ] Tes dan dokumentasi Swagger

#### 1.3. Update server pusat (apps/backend)

- [ ] Buat modul manajemen kredit
- [ ] Implementasi endpoint verifikasi kredit
- [ ] Buat sistem penerimaan metrik
- [ ] Implementasi model penagihan
- [ ] Tambahkan manajemen stack klien (CRUD)
- [ ] Buat modul provisioning VPS (Contabo API)
- [ ] Tes

#### 1.4. Tes integrasi WhatsApp

- [ ] Tes flow lengkap (penerimaan → pemrosesan → balasan)
- [ ] Tes verifikasi kredit
- [ ] Tes pelaporan
- [ ] Tes diskoneksi/rekoneksi

### Fase 2: Messenger dan Instagram

#### 2.1. Pembuatan messenger-agent

- [ ] Inisialisasi app NestJS
- [ ] Integrasi API Meta Messenger
- [ ] Implementasi webhook Meta
- [ ] Integrasi LangChain
- [ ] Implementasi verifikasi kredit
- [ ] Tes dan dokumentasi

#### 2.2. Pembuatan instagram-agent

- [ ] Inisialisasi app NestJS
- [ ] Integrasi API Instagram Graph
- [ ] Implementasi webhook Instagram
- [ ] Integrasi LangChain
- [ ] Implementasi verifikasi kredit
- [ ] Tes dan dokumentasi

#### 2.3. Tes integrasi

- [ ] Tes flow Messenger lengkap
- [ ] Tes flow Instagram lengkap

### Fase 3: Dashboard dan antarmuka pengguna

#### 3.1. Frontend (apps/frontend)

- [ ] Halaman manajemen instance WhatsApp
- [ ] Halaman konfigurasi agent (prompt, model)
- [ ] Dashboard metrik dan penggunaan
- [ ] Manajemen kredit dan penagihan
- [ ] Halaman manajemen server klien
- [ ] Tes

### Fase 4: Infrastruktur dan deployment

#### 4.1. Docker dan orkestrasi

- [ ] Buat Dockerfile untuk setiap layanan
- [ ] Buat docker-compose/stack
- [ ] Implementasi sistem deployment SSH
- [ ] Skrip provisioning VPS

#### 4.2. Integrasi Contabo

- [ ] Integrasi API Contabo
- [ ] Otomasi pembuatan VPS
- [ ] Otomasi konfigurasi awal (Docker Swarm)
- [ ] Otomasi deployment stack

#### 4.3. Monitoring dan log

- [ ] Pemusatan log (ELK atau Loki)
- [ ] Metrik (Prometheus + Grafana)
- [ ] Peringatan (error, diskoneksi, kredit rendah)

### Fase 5: Produksi dan optimasi

#### 5.1. Keamanan

- [ ] Enkripsi komunikasi
- [ ] Manajemen rahasia (Vault atau setara)
- [ ] Rate limiting
- [ ] Proteksi DDoS

#### 5.2. Optimasi

- [ ] Cache balasan serupa
- [ ] Optimasi prompt LangChain
- [ ] Pengurangan biaya API

#### 5.3. Tes beban

- [ ] Tes beban server pusat
- [ ] Tes beban agent
- [ ] Tes deployment multi-stack

---

## Teknologi yang Digunakan

### Backend

- **Framework:** NestJS
- **Database:** PostgreSQL
- **ORM:** Prisma (JANGAN PERNAH gunakan `prisma db push`, hanya migrasi)
- **Cache:** Redis
- **Queue:** Bull
- **Validasi:** class-validator, class-transformer
- **Dokumentasi:** Swagger/OpenAPI

### AI dan otomasi

- **LangChain:** Framework untuk orkestrasi LLM
- **OpenAI/Anthropic:** Model bahasa
- **wwebjs.dev:** Klien WhatsApp

### API eksternal

- **Meta Platform:** Messenger & Instagram
- **Contabo API:** Manajemen VPS

### Infrastruktur

- **Containerisasi:** Docker
- **Orkestrasi:** Docker Swarm
- **Provisioning:** SSH + skrip Bash
- **Monitoring:** Prometheus, Grafana
- **Log:** ELK Stack atau Loki

### Frontend

- **Framework:** React Router v7
- **State management:** Akan ditentukan (Context API, Zustand, Redux)
- **UI Library:** Akan ditentukan

---

## Model Penagihan

### Sistem kredit

- 1 kredit = X token (akan ditentukan)
- Pemotongan berdasarkan penggunaan API LLM aktual
- Paket bulanan dengan kredit termasuk
- Isi ulang dimungkinkan

### Tingkat harga (contoh)

- **Starter:** 1000 kredit/bulan
- **Pro:** 5000 kredit/bulan
- **Enterprise:** 20000 kredit/bulan + instance khusus

---

## Keamanan dan Kepatuhan

### Data pengguna

- Enkripsi data sensitif
- Kepatuhan GDPR
- Kebijakan retensi pesan

### Infrastruktur

- Isolasi jaringan antar stack
- Manajemen rahasia
- Autentikasi antar-layanan (JWT atau API key)
- Rate limiting per klien

### WhatsApp

- Mematuhi syarat penggunaan
- Isolasi IP untuk membatasi pemblokiran
- Rotasi instance dimungkinkan

---

## Metrik yang Dipantau

### Per pengguna

- Jumlah pesan yang diproses
- Token yang dikonsumsi
- Kredit tersisa
- Tingkat balasan
- Rata-rata waktu respons

### Per server klien

- Jumlah stack aktif
- Penggunaan CPU/RAM
- Status koneksi WhatsApp
- Error dan diskoneksi

### Global

- Pendapatan bulanan
- Biaya API (OpenAI, Meta, dll.)
- Biaya infrastruktur (Contabo)
- Margin

---

## Langkah Selanjutnya

### Segera (Fase 1.1)

1. Buat proyek whatsapp-connector
2. Konfigurasi struktur NestJS
3. Integrasi wwebjs.dev
4. Implementasi endpoint dasar

### Minggu ini

- Selesaikan whatsapp-connector
- Mulai whatsapp-agent
- Tes integrasi dasar

### Bulan ini

- Selesaikan Fase 1 (WhatsApp lengkap)
- Mulai Fase 2 (Messenger/Instagram)

---

## Catatan Penting

### Batasan teknis

- JANGAN PERNAH gunakan `prisma db push`, hanya migrasi
- Minimalkan update whatsapp-connector untuk menghindari diskoneksi
- Maksimum 3 stack per server klien
- Verifikasi kredit SEBELUM setiap pemrosesan

### Keputusan yang harus diambil

- [ ] Pilihan provider LLM default (OpenAI vs Anthropic)
- [ ] Model pricing yang tepat
- [ ] Stack monitoring (ELK vs Loki)
- [ ] Kebijakan retensi pesan
- [ ] Strategi backup

---

## Sumber Daya

- [Dokumentasi wwebjs.dev](https://wwebjs.dev/)
- [Dokumentasi NestJS](https://docs.nestjs.com/)
- [Dokumentasi LangChain](https://js.langchain.com/)
- [Meta Messenger Platform](https://developers.facebook.com/docs/messenger-platform)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Dokumentasi API Contabo](https://api.contabo.com/)

---

**Versi:** 1.0 **Tanggal:** 2025-11-11 **Status:** Sedang berjalan - Fase 1.1
