# Rekap Deployment

## Tujuan

Dokumen ini merangkum status deployment `bedones-whatsapp` saat ini agar dapat dilanjutkan nanti tanpa mulai dari nol.

## Arsitektur saat ini

- `backend` pusat:
  - dideploy terpisah pada VPS
  - mengorkestrasi pool stack
  - membuat VPS Hetzner via API
  - melacak status pembuatan Hetzner
  - memicu GitHub Actions hanya untuk instalasi stack pada VPS yang sudah siap
- `frontend`:
  - dideploy di Cloudflare Workers
- `VPS dinamis Hetzner`:
  - 1 VPS = beberapa stack
  - 1 stack = `postgres + redis + qdrant + cropper + whatsapp-agent + whatsapp-connector + caddy`
  - 2 port TLS diekspos per stack:
    - port agent
    - port connector
- `step-ca`:
  - dideploy di VPS backend
  - digunakan untuk sertifikat mTLS backend <-> agent/connector

## Flow provisioning saat ini

### 1. Permintaan kapasitas

- Backend memanggil `StackPoolService.provisionCapacity()`
- Backend membuat:
  - `ProvisioningServer`
  - `ProvisioningWorkflowRun`

### 2. Pembuatan VPS Hetzner

- Backend membuat VPS langsung via `HetznerCloudService`
- Backend menyimpan:
  - `providerServerId`
  - `hetznerActionId`
  - IP jika tersedia

### 3. Pelacakan aksi Hetzner

- Backend tidak lagi melakukan poll di memori dengan `setInterval`
- Polling Hetzner sekarang melalui queue Bull/Redis
- Service yang ditambahkan:
  - `apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts`
- Pemrosesan bisnis tetap di:
  - `apps/backend/src/stack-pool/stack-pool.service.ts`
  - method `processPendingHetznerInitializations()`

### 4. Pemicuan CI instalasi

- Saat VPS Hetzner siap dan `public_ipv4` diketahui:
  - backend memicu `install-bedones-whatsapp-agent.yml`
- Workflow GitHub tidak lagi membeli VPS
- Workflow hanya menginstal stack pada VPS yang sudah ada

### 5. Akhir provisioning

- Workflow GitHub memanggil callback backend:
  - `POST /stack-pool/workflows/callback`
- Backend:
  - memperbarui `ProvisioningWorkflowRun`
  - membuat/memperbarui stack
  - memeriksa konektivitas
  - melanjutkan flow login/QR jika perlu

## Workflow GitHub

### Instalasi

- Workflow utama:
  - `.github/workflows/install-bedones-whatsapp-agent.yml`
- Skrip utama:
  - `.github/scripts/install-bedones-whatsapp-agent-vps.sh`

Skrip ini:
- bootstrap `step-ca`
- menerbitkan sertifikat
- merender stack
- mengirim file ke VPS
- menjalankan `docker compose up -d`
- melakukan healthcheck
- memanggil backend pada:
  - `running`
  - `success`
  - `failed` via `trap on_error`

### Kompatibilitas

- `.github/workflows/provision-bedones-whatsapp-agent.yml`
  - dipertahankan sebagai alias kompatibilitas
  - memanggil skrip instalasi yang sama

### Release

- Workflow:
  - `.github/workflows/release-bedones-whatsapp-agent.yml`
- Skrip:
  - `.github/scripts/release-bedones-whatsapp-agent-vps.sh`

Release tetap memanggil backend via callback.

## mTLS / step-ca

- `step-ca` saat ini diekspos langsung di server backend
- URL yang digunakan di sisi GitHub:
  - `STEP_CA_URL=https://<IP_BACKEND>:9898`
- `BACKEND_INTERNAL_URL`:
  - `https://<IP_BACKEND>:9443`

Workflow instalasi:
- mengunduh root `step-ca`
- menerbitkan sertifikat klien/server
- menyiapkan Caddy
- mengekspos port TLS per stack

## Variabel/backend penting

### Backend `.env`

Variabel kunci:

- `HERZNET_API_KEY`
- `HERZNET_SSH_KEY_NAMES`
- `STACK_POOL_DEFAULT_SERVER_TYPE=cpx22`
- `STACK_POOL_DEFAULT_LOCATION=nbg1`
- `STACK_POOL_HETZNER_POLL_INTERVAL_MS=5000`
- `GITHUB_ACTIONS_REPOSITORY`
- `GITHUB_ACTIONS_TOKEN`
- `GITHUB_PROVISION_WORKFLOW_FILE=install-bedones-whatsapp-agent.yml`
- `GITHUB_RELEASE_WORKFLOW_FILE=release-bedones-whatsapp-agent.yml`
- `STACK_INFRA_CALLBACK_SECRET`
- `BACKEND_INTERNAL_URL`
- `BACKEND_MTLS_SERVER_CERT`
- `BACKEND_MTLS_SERVER_KEY`
- `BACKEND_MTLS_CLIENT_CERT`
- `BACKEND_MTLS_CLIENT_KEY`
- `STEP_CA_ROOT_CERT`

### GitHub secrets / vars

Yang harus dipertahankan:

- `STEP_CA_URL`
- `STEP_CA_FINGERPRINT`
- `STEP_CA_PROVISIONER_NAME`
- `STEP_CA_PROVISIONER_PASSWORD`
- `AGENT_INTERNAL_JWT_SECRET`
- `CONNECTOR_SECRET`
- `STACK_INFRA_CALLBACK_SECRET`
- `GHCR_READ_TOKEN`
- `WHATSAPP_AGENT_IMAGE`
- `WHATSAPP_CROPPER_IMAGE`
- `WHATSAPP_CONNECTOR_IMAGE`
- `BACKEND_URL`
- `BACKEND_INTERNAL_URL`

## Log yang sudah ditambahkan

Backend sekarang mencatat:

- pembuatan record `ProvisioningServer`
- pembuatan record `ProvisioningWorkflowRun`
- request Hetzner mentah
- response Hetzner mentah
- status polling Hetzner
- dispatch GitHub:
  - workflow
  - input yang dikirim
  - response GitHub

Skrip instalasi sekarang mencatat:

- URL callback backend
- URL backend internal
- URL `step-ca`
- payload callback
- response HTTP callback
- langkah render, upload, `docker compose`, healthcheck

## Kasus yang ditangani

### VPS Hetzner dihapus manual

Pemrosesan lokal telah ditambahkan untuk kasus ini:

- jika Hetzner merespons `404 resource_not_found` selama inisialisasi
- backend keluar dari loop
- workflow ditandai gagal
- server ditandai `RELEASED`

### Pembuatan Hetzner gagal

Workflow tanpa `providerServerId` tidak lagi di-poll ulang.

### Callback error CI

Bug `jq --argjson` di skrip instalasi sudah diperbaiki.

## Commit yang sudah di-push

Commit berikut sudah ada di `main`:

- `6b4e0d1` `Move Hetzner provisioning into backend`
- `ea90504` `Improve Hetzner provisioning diagnostics`
- `1d7b050` `Log Hetzner provisioning end to end`
- `69cb0e3` `Fix provisioning polling and install callback payload`

## Perubahan yang masih lokal saat dokumen ini ditulis

Belum di-commit/belum tentu di-push saat dokumen ini ditulis:

- perpindahan polling Hetzner ke Bull/Redis
- penghentian yang bersih jika VPS dihapus manual di Hetzner
- pengurangan noise log `pending_workflows=0`

File lokal yang terkait:

- `apps/backend/src/stack-pool/hetzner-cloud.service.ts`
- `apps/backend/src/stack-pool/stack-pool.module.ts`
- `apps/backend/src/stack-pool/stack-pool.service.ts`
- `apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts`

## Hal yang perlu diperiksa saat restart

### Backend

- pastikan backend berjalan dengan commit yang benar
- pastikan `REDIS_URL` ada jika menggunakan queue Bull
- pastikan `HERZNET_API_KEY` ada di sisi backend
- pastikan `GITHUB_PROVISION_WORKFLOW_FILE=install-bedones-whatsapp-agent.yml`

### step-ca

- pastikan `step-ca` merespons
- pastikan `STEP_CA_URL` di sisi GitHub mengarah ke port yang benar

### Provisioning

Pada tes manual:

1. picu `/infra/stack-pool/provision`
2. periksa log backend:
   - pembuatan record server/workflow
   - panggilan Hetzner
   - response Hetzner
   - polling aksi
   - dispatch GitHub
3. periksa workflow GitHub instalasi
4. periksa callback akhir ke backend

## File utama yang perlu dibaca ulang lain kali

- [deployment.md](/Users/bruce/Documents/project/whatsapp-agent/deployment.md)
- [stack-pool.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/stack-pool.service.ts)
- [hetzner-cloud.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/hetzner-cloud.service.ts)
- [stack-pool-hetzner-poll-scheduler.service.ts](/Users/bruce/Documents/project/whatsapp-agent/apps/backend/src/stack-pool/stack-pool-hetzner-poll-scheduler.service.ts)
- [install-bedones-whatsapp-agent.yml](/Users/bruce/Documents/project/whatsapp-agent/.github/workflows/install-bedones-whatsapp-agent.yml)
- [install-bedones-whatsapp-agent-vps.sh](/Users/bruce/Documents/project/whatsapp-agent/.github/scripts/install-bedones-whatsapp-agent-vps.sh)
