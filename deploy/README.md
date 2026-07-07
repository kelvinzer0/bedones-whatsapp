# Standalone Deployment Guide

Panduan deploy Bedones WhatsApp sebagai **standalone full stack** di 1 VPS (testing/demo/single-tenant production).

## Prasyarat

- VPS dengan minimal **2 vCPU, 4GB RAM, 20GB disk** (rekomendasi: 4 vCPU / 8GB untuk production)
- Docker Engine 24+ dan Docker Compose v2
- Akses root atau user dengan sudo
- (Opsional) Domain + DNS A record ke IP VPS untuk TLS otomatis

Cek Docker sudah terpasang:
```bash
docker --version
docker compose version
```

## Langkah 1: Clone repo dan siapkan environment

```bash
git clone https://github.com/kelvinzer0/bedones-whatsapp.git
cd bedones-whatsapp

# Copy env template
cp .env.prod.example .env.prod
```

## Langkah 2: Generate secret keys

Generate strong random strings untuk semua secret:

```bash
# Generate 4 secret keys sekaligus
for key in JWT_SECRET QR_JWT_SECRET AGENT_INTERNAL_JWT_SECRET CONNECTOR_SECRET; do
  echo "$key=$(openssl rand -hex 32)"
done

# Generate ENCRYPTION_KEY (exactly 32 characters)
echo "ENCRYPTION_KEY=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
```

Copy output ke `.env.prod`, ganti placeholder `replace-with-*`.

## Langkah 3: Isi API keys

Edit `.env.prod`:

```bash
nano .env.prod
```

Wajib diisi minimal salah satu:
- `GEMINI_API_KEY` — dari https://makersuite.google.com/app/apikey
- `XAI_API_KEY` — dari https://console.x.ai/

Optional (untuk fitur lengkap):
- `MINIO_*` — kalau punya Minio/S3 instance
- `STRIPE_*` / `NOTCH_*` — kalau mau aktifkan billing

## Langkah 4: Set public URL (kalau punya domain)

Edit `.env.prod`:

```env
# Kalau punya domain + reverse proxy (nginx/caddy) di depan:
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://chat.yourdomain.com

# Kalau testing lokal:
BACKEND_URL=http://YOUR_VPS_IP:3000
FRONTEND_URL=https://chat-bedones.insidexofficial.workers.dev
```

## Langkah 5: Jalankan stack

```bash
# Pull images terbaru dari GHCR
docker compose -f docker-compose.prod.yml --env-file .env.prod pull

# Start semua services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Lihat log (tekan Ctrl+C untuk keluar, services tetap jalan)
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f whatsapp-agent
docker compose -f docker-compose.prod.yml logs -f whatsapp-connector
```

## Langkah 6: Verifikasi services sehat

```bash
# Cek status semua services
docker compose -f docker-compose.prod.yml ps

# Test health endpoint setiap service
curl http://localhost:3000/health    # backend
curl http://localhost:3001/health    # connector
curl http://localhost:3002/health    # agent
curl http://localhost:8011/health    # image-cropper
```

Semua harus return `{"status":"ok"}` atau HTTP 200.

## Langkah 7: Pairing WhatsApp

Setelah connector sehat, ambil QR code untuk pairing:

```bash
# Lihat QR code di log connector
docker compose -f docker-compose.prod.yml logs whatsapp-connector | grep -A 20 "QR"
```

Atau ambil via API:
```bash
curl http://localhost:3001/whatsapp/qr
```

Scan QR dengan WhatsApp di HP Anda (Settings → Linked Devices → Link a Device).

## Langkah 8: Generate AGENT_BACKEND_TOKEN (penting!)

Setelah backend sehat dan punya WhatsApp agent record di DB, generate token:

```bash
# 1. Masuk ke container backend
docker compose -f docker-compose.prod.yml exec backend sh

# 2. Di dalam container, jalankan script generate-token
cd /app
node generate-token.cjs
# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Copy token, keluar dari container
exit
```

Edit `.env.prod`, isi:
```env
AGENT_BACKEND_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart whatsapp-agent:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod restart whatsapp-agent
```

## Manajemen sehari-hari

```bash
# Stop stack
docker compose -f docker-compose.prod.yml down

# Stop dan hapus volumes (RESET DATA — hati-hati!)
docker compose -f docker-compose.prod.yml down -v

# Update ke image terbaru
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Lihat resource usage
docker stats

# Backup database
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U bedones app_db > backup_app_db.sql
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U bedones agent_db > backup_agent_db.sql

# Restore database
cat backup_app_db.sql | docker compose -f docker-compose.prod.yml exec -T postgres psql -U bedones app_db
```

## Troubleshooting

### Backend tidak bisa connect ke database
```bash
# Cek log backend
docker compose -f docker-compose.prod.yml logs backend | tail -50

# Cek postgres healthy?
docker compose -f docker-compose.prod.yml ps postgres
```

### WhatsApp connector crash / Chromium error
Connector butuh memori cukup untuk Chromium. Pastikan VPS minimal 4GB RAM.
```bash
# Cek memory
free -h

# Cek log connector
docker compose -f docker-compose.prod.yml logs whatsapp-connector | tail -50
```

### Prisma migration failed
```bash
# Masuk ke container backend, jalankan manual
docker compose -f docker-compose.prod.yml exec backend sh
cd /app/apps/backend
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

### Port sudah dipakai
Edit `.env.prod`:
```env
BACKEND_PORT=3006      # ganti kalau 3000 dipakai
CONNECTOR_PORT=3011    # ganti kalau 3001 dipakai
AGENT_PORT=3012        # ganti kalau 3002 dipakai
```

### QR code tidak muncul
```bash
# Restart connector dengan autostart true
docker compose -f docker-compose.prod.yml restart whatsapp-connector

# Atau picu manual via API
curl -X POST http://localhost:3001/whatsapp/initialize
```

## Akses API setelah deploy

- **Backend Swagger docs**: http://YOUR_VPS_IP:3000/api
- **Connector Swagger docs**: http://YOUR_VPS_IP:3001/api
- **Agent Swagger docs**: http://YOUR_VPS_IP:3002/api
- **Frontend** (sudah deploy terpisah di Cloudflare): https://chat-bedones.insidexofficial.workers.dev

Update `VITE_API_URL` di frontend kalau backend Anda di domain berbeda.

## Reverse proxy + TLS (opsional, recommended untuk production)

Gunakan Caddy untuk auto-TLS:

```caddyfile
# /etc/caddy/Caddyfile
api.yourdomain.com {
    reverse_proxy localhost:3000
}

chat.yourdomain.com {
    reverse_proxy localhost:5173  # atau pakai Cloudflare Workers
}
```

Atau nginx:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Lalu jalankan certbot untuk SSL gratis.

## Arsitektur yang berjalan

```
┌─────────────────────────────────────────────────────┐
│  VPS Anda                                           │
│                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────────┐    │
│  │ Backend  │──▶│ Postgres │   │ Qdrant       │    │
│  │ :3000    │   │ :5432    │   │ (vector DB)  │    │
│  └────┬─────┘   └──────────┘   └──────────────┘    │
│       │           ┌──────────┐                      │
│       │           │ Redis    │                      │
│       │           │ :6379    │                      │
│       │           └──────────┘                      │
│       ▼                                             │
│  ┌──────────────┐   ┌──────────────────┐           │
│  │ WhatsApp     │──▶│ Image Cropper    │           │
│  │ Agent :3002  │   │ :8011 (Python)   │           │
│  └──────┬───────┘   └──────────────────┘           │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────┐                              │
│  │ WhatsApp         │  ←── Chromium + wwebjs       │
│  │ Connector :3001  │  ←── WhatsApp Web sessions   │
│  └──────────────────┘                              │
└─────────────────────────────────────────────────────┘
        ↑
        │ HTTPS (Cloudflare Workers)
        │
┌──────────────────┐
│ Frontend (React) │
│ CF Workers       │
└──────────────────┘
```

## Keamanan

**Wajib ganti sebelum production:**
- `POSTGRES_PASSWORD` — pakai password kuat
- Semua `*_SECRET` dan `*_KEY` — generate random
- `ENCRYPTION_KEY` — exactly 32 karakter random
- Jangan expose port database (5432), Redis (6379), Qdrant (6333) ke internet — pakai firewall

**Firewall recommendation:**
```bash
# Hanya expose port yang perlu
ufw default deny incoming
ufw allow 22/tcp       # SSH
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw allow 3000/tcp     # Backend (atau pakai reverse proxy, jangan expose langsung)
ufw enable
```

Lebih aman: jangan expose port 3000/3001/3002 langsung, pakai reverse proxy (Caddy/nginx) yang handle TLS.
