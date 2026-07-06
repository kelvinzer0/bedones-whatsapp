# WhatsApp Connector

Layanan koneksi WhatsApp - Wrapper REST untuk whatsapp-web.js

## Deskripsi

WhatsApp Connector adalah layanan NestJS yang mengekspos semua fungsi whatsapp-web.js melalui API REST generik. Layanan ini memungkinkan eksekusi metode klien WhatsApp apa pun dan menyiarkan semua event WhatsApp ke webhook yang dapat dikonfigurasi.

## Fitur

- **Endpoint generik `/whatsapp/execute`**: Jalankan metode klien whatsapp-web.js apa pun
- **Sistem webhook**: Semua event WhatsApp dikirim ke URL yang dikonfigurasi
- **Manajemen QR code**: Tampilan di terminal + endpoint API untuk pengambilan
- **Sesi persisten**: Sesi WhatsApp disimpan secara lokal
- **Dokumentasi Swagger**: API terdokumentasi sepenuhnya

## Instalasi

```bash
# Dari root monorepo
pnpm install
```

## Konfigurasi

Buat file `.env` berdasarkan `.env.example`:

```bash
# Port server
PORT=3001

# Path penyimpanan sesi WhatsApp
WHATSAPP_SESSION_PATH=./data/sessions

# URL webhook (dipisahkan dengan koma)
WEBHOOK_URLS=http://localhost:3002/webhook/message
```

## Memulai

```bash
# Mode pengembangan
pnpm dev:whatsapp-connector

# Mode produksi
pnpm build:whatsapp-connector
pnpm start:whatsapp-connector
```

## Penggunaan

### 1. Koneksi pertama

Saat mulai, jika tidak ada sesi, QR code akan ditampilkan di terminal. Pindai dengan WhatsApp untuk autentikasi klien.

Anda juga bisa mengambil QR code via API:

```bash
GET http://localhost:3001/whatsapp/qr
```

### 2. Jalankan metode WhatsApp

Gunakan endpoint generik untuk menjalankan metode klien apa pun:

```bash
POST http://localhost:3001/whatsapp/execute
Content-Type: application/json

{
  "method": "sendMessage",
  "parameters": ["123456789@c.us", "Hello World!"]
}
```

#### Contoh metode yang tersedia

**Kirim pesan:**

```json
{
  "method": "sendMessage",
  "parameters": ["123456789@c.us", "Halo!"]
}
```

**Ambil semua chat:**

```json
{
  "method": "getChats",
  "parameters": []
}
```

**Ambil kontak berdasarkan ID:**

```json
{
  "method": "getContactById",
  "parameters": ["123456789@c.us"]
}
```

**Tandai chat sebagai dibaca:**

```json
{
  "method": "getChatById",
  "parameters": ["123456789@c.us"]
}
```

### 3. Periksa status

```bash
GET http://localhost:3001/whatsapp/status
```

Respons:

```json
{
  "isReady": true,
  "hasQrCode": false,
  "state": {
    "wid": { ... },
    "pushname": "WhatsApp Saya"
  }
}
```

### 4. Konfigurasi webhook

```bash
# Ambil webhook saat ini
GET http://localhost:3001/whatsapp/webhooks

# Konfigurasi webhook baru
POST http://localhost:3001/whatsapp/webhooks
Content-Type: application/json

{
  "urls": [
    "http://localhost:3002/webhook/message",
    "http://localhost:3000/webhook/whatsapp"
  ]
}
```

## Event Webhook

Semua event berikut dikirim ke webhook yang dikonfigurasi:

### Autentikasi

- `qr` - QR code tersedia
- `ready` - Klien siap
- `authenticated` - Autentikasi berhasil
- `auth_failure` - Autentikasi gagal
- `disconnected` - Terputus

### Pesan

- `message` - Pesan diterima
- `message_create` - Pesan dibuat (dikirim atau diterima)
- `message_ack` - Konfirmasi penerimaan
- `message_edit` - Pesan diedit
- `message_revoke_me` - Pesan dihapus (untuk saya)
- `message_revoke_everyone` - Pesan dihapus (untuk semua)
- `message_reaction` - Reaksi pesan
- `media_uploaded` - Media diupload

### Grup

- `group_join` - Anggota bergabung grup
- `group_leave` - Anggota keluar grup
- `group_update` - Grup diperbarui
- `group_admin_changed` - Admin grup berubah
- `group_membership_request` - Permintaan keanggotaan grup

### Lainnya

- `chat_archived` - Chat diarsipkan
- `chat_removed` - Chat dihapus
- `contact_changed` - Kontak diubah
- `change_state` - Perubahan status
- `incoming_call` - Panggilan masuk
- `vote_update` - Pembaruan suara (jajak pendapat)

### Format event

Semua event dikirim dalam format:

```json
{
  "event": "message",
  "timestamp": "2025-11-11T10:30:00.000Z",
  "data": {
    "id": { ... },
    "from": "123456789@c.us",
    "to": "987654321@c.us",
    "body": "Hello!",
    "type": "chat",
    ...
  }
}
```

## Dokumentasi API

Dokumentasi Swagger lengkap tersedia di:

```
http://localhost:3001/api
```

## Arsitektur

```
src/
├── whatsapp/
│   ├── whatsapp-client.service.ts  # Manajemen klien WhatsApp
│   ├── webhook.service.ts          # Manajemen webhook
│   ├── whatsapp.controller.ts      # Endpoint REST
│   ├── whatsapp.module.ts          # Modul NestJS
│   └── dto/
│       ├── execute-method.dto.ts
│       └── set-webhooks.dto.ts
├── health/                         # Health check
├── app.module.ts
└── main.ts
```

## Catatan penting

- Connector harus diperbarui sesedikit mungkin untuk menghindari diskoneksi WhatsApp
- Sesi disimpan secara lokal di `WHATSAPP_SESSION_PATH`
- Layanan tidak diekspos secara publik - hanya digunakan oleh agent

## Metode WhatsApp yang tersedia

Lihat dokumentasi whatsapp-web.js untuk daftar lengkap:
https://docs.wwebjs.dev/Client.html

Contoh metode umum:

- `sendMessage(chatId, content)`
- `getChats()`
- `getChatById(chatId)`
- `getContacts()`
- `getContactById(contactId)`
- `archiveChat(chatId)`
- `muteChat(chatId, unmuteDate)`
- `pinChat(chatId)`
- `createGroup(name, participants)`
- `setStatus(status)`
- `setDisplayName(displayName)`
- `setProfilePicture(media)`

Dan banyak lagi...

## Pemecahan Masalah

### QR code tidak muncul

- Pastikan `WHATSAPP_SESSION_PATH` dapat ditulis
- Hapus folder sesi dan mulai ulang

### Diskoneksi sering

- Hindari mulai ulang layanan terlalu sering
- Pastikan server memiliki sumber daya yang cukup
- Pastikan Chromium/Puppeteer berfungsi dengan baik

### Webhook tidak menerima event

- Pastikan `WEBHOOK_URLS` dikonfigurasi dengan benar
- Periksa log layanan untuk error HTTP
- Tes URL dengan curl/Postman
