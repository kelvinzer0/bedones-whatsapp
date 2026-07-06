# Rencana Hetzner untuk Bedones WhatsApp

## Tujuan

Menyiapkan provisioning yang dikendalikan oleh backend untuk VPS Hetzner yang meng-host stack
`connector + whatsapp-agent + postgres + qdrant + cropper`, sementara backend pusat tetap
dideploy terpisah. Backend berbicara langsung ke API Hetzner untuk membuat VPS dan melacak
`actionId`, lalu memicu `workflow_dispatch` GitHub pada self-hosted runner hanya
saat server siap menerima stack.

## Pembagian target

- `backend` pusat:
  - onboarding
  - penagihan
  - orkestrasi stack
  - pelacakan status agent
- `node connector`:
  - `whatsapp-connector`
  - `whatsapp-agent`
  - `postgres`
  - `redis`
  - `qdrant`
  - `cropper`
  - satu basis Postgres lokal per stack, dihapus bersama stack

## Batasan jaringan yang dipilih

- Backend pusat tetap di luar Hetzner.
- VPS Hetzner mempertahankan IP publik untuk bootstrap, `docker pull`, dan SSH.
- Komunikasi `backend ↔ connector/agent` melalui IP publik + mTLS `step-ca` +
  firewall ketat.
- Jaringan privat Hetzner tidak lagi diperlukan pada fase ini.

## Variabel backend yang harus disiapkan

Variabel-variabel ini ada di backend pusat untuk mengendalikan kapasitas dan dispatch GitHub.

```env
STACK_POOL_PROVISION_ON_BOOT=true
STACK_POOL_BOOTSTRAP_VPS_COUNT=2
STACK_POOL_MIN_FREE_STACKS=4
STACK_POOL_DEFAULT_STACKS_PER_VPS=2
STACK_POOL_DEFAULT_SERVER_TYPE=cpx22
STACK_POOL_DEFAULT_LOCATION=nbg1
STACK_POOL_HETZNER_POLL_INTERVAL_MS=5000
HERZNET_API_KEY=
HERZNET_SSH_KEY_NAMES=
STACK_POOL_HETZNER_IMAGE=docker-ce
STACK_POOL_SERVER_NAME_PREFIX=bedones-wa
GITHUB_ACTIONS_REPOSITORY=owner/whatsapp-agent
GITHUB_ACTIONS_TOKEN=
GITHUB_ACTIONS_REF=main
GITHUB_PROVISION_WORKFLOW_FILE=install-bedones-whatsapp-agent.yml
GITHUB_RELEASE_WORKFLOW_FILE=release-bedones-whatsapp-agent.yml
STACK_INFRA_CALLBACK_SECRET=
```

## Secret runner / workflow

Nilai-nilai ini ada di sisi GitHub Actions / self-hosted runner:

```env
STACK_INFRA_CALLBACK_SECRET=
WHATSAPP_AGENT_IMAGE=ghcr.io/.../bedones-whatsapp-agent:main
WHATSAPP_CROPPER_IMAGE=ghcr.io/.../bedones-whatsapp-cropper:main
WHATSAPP_CONNECTOR_IMAGE=ghcr.io/.../bedones-whatsapp-connector:main
STEP_CA_URL=https://ca-or-ip:9898
STEP_CA_FINGERPRINT=
STEP_CA_PROVISIONER_NAME=github-actions
STEP_CA_PROVISIONER_PASSWORD=
```

## Model data yang dipilih

Model `WhatsAppAgent` tetap menjadi titik masuk aplikasi, tetapi juga berfungsi sebagai inventaris
stack yang dapat dipesan. Kami menambahkan:

- `ProvisioningServer`
  - status VPS Hetzner
  - IP publik / privat
  - tipe, lokasi, jumlah stack yang direncanakan
- `ProvisioningWorkflowRun`
  - tipe `PROVISION_CAPACITY` atau `RELEASE_CAPACITY`
  - pemetaan dengan `workflow_dispatch` GitHub
  - progres, langkah saat ini, callback ke backend
- `WhatsAppAgent`
  - field `serverId`, `stackSlot`, `stackLabel`
  - `assignmentStatus` (`FREE`, `RESERVED`, `ALLOCATED`, ...)
  - `reservationExpiresAt`, `allocatedAt`, `releasedAt`

## Workflow backend yang dipilih

1. Backend memulai dan memeriksa stok bebas.
2. Jika stok bebas di bawah ambang, backend membuat VPS Hetzner via API Cloud.
3. Backend melakukan poll `actionId` Hetzner hingga server siap.
4. Saat server siap, backend memicu `install-bedones-whatsapp-agent.yml`.
5. Workflow merender stack dari
   `.github/stack-templates/bedones-whatsapp-agent/stack.template.yml`, menerbitkan sertifikat
   `step-ca` dan men-deploy stack.
6. Workflow memanggil `POST /stack-pool/workflows/callback`.
7. Backend mencatat stack bebas, memeriksa `/health` pada `whatsapp-agent`
   dan `whatsapp-connector`, lalu menetapkan stack jika pengguna sudah menunggu.

## Jaringan

- Backend pusat berbicara ke `connector` dan `whatsapp-agent` via IP publik VPS.
- Setiap stack hanya mempublikasikan 2 port TLS:
  - satu port `agent`
  - satu port `connector`
- `redis`, `postgres`, `qdrant`, dan `cropper` tetap internal ke stack.
- Firewall Hetzner harus membatasi akses masuk ke IP backend dan admin yang diizinkan.

## Kebijakan penempatan

- Satu VPS = beberapa stack klien.
- Backend memesan stack bebas yang ada saat pengguna mengklik lanjut.
- Segera setelah pemesanan, backend memicu provisioning lagi jika stok bebas
  turun di bawah `STACK_POOL_MIN_FREE_STACKS`.
- Pertahankan tipe mesin dapat dikonfigurasi via `STACK_POOL_DEFAULT_SERVER_TYPE`.

## Update connector di masa depan

Poin sensitif adalah sesi WhatsApp. Strategi teraman:

1. Simpan sesi pada volume persisten khusus per stack.
2. Deploy image baru ke stack yang ada, tidak pernah ke volume baru.
3. Lakukan update bertahap service per service.
4. Verifikasi `/health` lalu status `ready` sebelum menganggap update berhasil.
5. Siapkan rollback langsung ke tag sebelumnya jika sesi tidak dipulihkan.

## Langkah berikutnya

1. Tambahkan halaman pricing auth-friendly jika `existing user && kredit habis`.
2. Ganti siaran QR "fallback broadcast" dengan routing ketat per `connectorInstanceId`
   untuk semua stack.
3. Tambahkan release cerdas yang juga menghapus VPS jika semua stack-nya bebas.
4. Hubungkan telemetri GitHub Actions lebih halus jika ingin menampilkan lebih dari 3 langkah bisnis
   di sisi frontend.
5. Tambahkan rotasi tag image di sisi backend untuk update terkontrol.
