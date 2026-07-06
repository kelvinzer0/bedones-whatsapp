# Metadata Rencana - Pemrosesan gambar & audio via whatsapp-connector / whatsapp-agent

## Konteks & tujuan
- Tambahkan lapisan metadata per pesan untuk mencatat hasil pemrosesan media (OCR/vision, STT) di sisi backend.
- Pindahkan pemrosesan AI ke whatsapp-agent dan simpan hasilnya di backend (Prisma) untuk memperkaya percakapan dan mengurangi biaya token.
- Ubah pemrosesan percakapan ke sistem job yang dapat dibatalkan per percakapan untuk menghindari balasan yang tidak perlu.

## Ruang Lingkup
- whatsapp-connector (wweb.js): deteksi pesan media (gambar, audio), download dan kirim ke whatsapp-agent.
- whatsapp-agent: pipeline pemrosesan (audio -> STT, gambar -> OCR+Gemini), penulisan metadata ke backend.
- Backend (Prisma): tabel baru `MessageMetadata`, ekspos API/queue untuk menulis metadata dan melacak status job.

## Model Data (apps/backend/prisma/schema.prisma)
- Tambahkan enum `MessageMetadataType { AUDIO, IMAGE }`.
- Model baru `MessageMetadata`:
  - `id` (cuid), `messageId` (string, ID WhatsApp), `type` (enum), `metadata` (Json), `createdAt`, `updatedAt`.
  - Indeks yang direkomendasikan: `(messageId, type)` unik, `(createdAt)`.
  - Relasi masa depan opsional: foreign key ke tabel Message jika ada/akan datang; jika tidak, `messageId` tetap bebas (ID wwebjs `Message.id._serialized`).

## Flow target (tingkat tinggi)
1) `whatsapp-connector`
   - Dengarkan event `message_create` dari `whatsapp-web.js` (tipe `Message`, `MessageMedia`).
   - Kumpulkan riwayat lokal (sesuai jendela yang tersedia via wweb.js) untuk `chatId`.
   - Filter: `msg.hasMedia && msg.type === 'image' | 'ptt' | 'audio'`.
   - Download: `await msg.downloadMedia()`; upload biner via backend (gunakan koneksi BACKEND_WEBHOOK_URL atau via agent yang meneruskan ke backend: `connector -> agent -> backend`) untuk menghindari duplikasi service upload. URL yang ditandatangani dikembalikan dan disuntikkan ke payload yang dikirim ke whatsapp-agent.
   - Publikasikan ke whatsapp-agent (HTTP atau queue) job `ProcessMediaJob` dengan: `messageId`, `chatId`, `from`, `timestamp`, `mediaUrl`/buffer, `mediaType`, `businessId` (userId), `connectorInstanceId`, `history` (ringkasan/N pesan terakhir).

2) `whatsapp-agent` - Orkestrasi job
   - Menerima pesan + riwayat + URL media; memeriksa `canReply` sebelum memproses.
   - Queue job (BullMQ/NestJS queues cf. https://docs.nest-js.fr/techniques/queues) per percakapan (`chatId`) dengan kunci deduplikasi: satu job aktif per percakapan.
   - Jika pesan baru tiba: batalkan job yang sedang berjalan (AbortController) dan jadwalkan ulang dengan konteks terbaru; pastikan semua panggilan LLM/AI yang berjalan dihentikan untuk membatasi token.
   - Status job: `pending | running | cancelled | failed | done`, disimpan di memori + logging ke backend jika perlu.
   - Menyediakan endpoint backend yang menerima daftar ID pesan dan mengembalikan metadata terkait untuk membangun konteks sebelum balasan; job dibuat setelah membatalkan yang sedang berjalan untuk kontak ini.

3) Pemrosesan AUDIO (fase 1 prioritas)
   - Input: `mediaType in ['ptt','audio']`, media dalam `ogg/opus` (wwebjs) atau lainnya.
   - Langkah:
     a. Normalisasi/konversi ke `wav` (jika diperlukan) dengan ffmpeg (pipeline yang ada atau tambahkan di sisi agent).
     b. Transkripsi STT (Gemini Audio API atau provider saat ini) dengan prompt ringan untuk konteks bisnis (bahasa ID secara default).
     c. Tulis `MessageMetadata` dengan `{ transcript, language?, durationSec?, confidence? }`.
   - Penanganan error: jika STT gagal, catat metadata `{ error, stage: 'stt' }` dan kembalikan status `failed` tetapi jangan blokir flow pesan.

4) Pemrosesan IMAGE (fase 2)
   - Langkah:
     a. OCR tertarget retailer:
        - OCR pada gambar (Tesseract/vision provider). Contoh struktur `/Users/bruce/Documents/project/hellio/plateforme-B2C-back/src/utils/ocr.service.ts` (Tesseract) untuk service.
        - Ekstrak `retailer_id` / SKU via regex atau lookup katalog bisnis.
        - Jika ditemukan, perkaya metadata: `{ whatsapp_product_id, name, retailer_id, price, collectionId }` (price = nilai mentah / 100).
     b. Fallback deskripsi Gemini (tanpa LangChain): prompt spesifik "jelaskan secara presisi produk, kategori, bahan, warna, kondisi, teks yang terlihat".
        - Hasil disimpan di metadata `{ description, labels?, safety? }`.
   - Tambahkan field `ocrEngine` / `visionModel` untuk tracability.

5) Persistensi & antarmuka Backend
   - Ekspos endpoint / message bus untuk `upsertMessageMetadata({ messageId, type, metadata })`.
   - Pastikan idempotensi pada `(messageId, type)`.
   - Tambahkan migrasi Prisma untuk `MessageMetadata` + enum. Siapkan seed atau skrip migrasi.

6) Tata kelola & observabilitas
   - Log terstruktur per jobId dan chatId (connector + agent).
   - Metrik: durasi rata-rata OCR/STT, tingkat deteksi produk, tingkat pembatalan job.
   - Penyimpanan media: konfirmasi kuota / kebijakan retensi (terutama audio mentah setelah transkripsi).

## Roadmap inkremental
- Fase 0 (persiapan): Tambahkan model Prisma + migrasi; definisikan kontrak API/queue `ProcessMediaJob`; siapkan AbortController bersama di whatsapp-agent.
- Fase 1 (audio): Implementasikan pipeline STT, penulisan metadata, tes pada pesan suara; guardrail bahasa dan durasi maks.
- Fase 2 (gambar): Implementasikan OCR tertarget retailer + fallback Gemini; hubungkan lookup katalog bisnis; tes pada kasus dengan dan tanpa retailer_id.
- Fase 3 (scheduler job): Terapkan satu job aktif per percakapan, pembatalan pada pesan baru, handler penghentian panggilan AI.
- Fase 4 (reliabilitas): Monitoring, retry idempoten, pembersihan media, dokumentasi wweb.js (tipe `Message`, `MessageMedia`, `Client` events) dan playbook insiden.

## Poin terbuka
- Pilihan provider STT (Gemini Audio vs yang ada) dan biaya unit.
- Di mana mempertahankan blob media (MinIO saat ini?), dan durasi penyimpanan.
- Format katalog produk yang tepat untuk pencocokan OCR (regex/lookup API backend).
- Kebutuhan tabel `Message` perantara untuk menghubungkan metadata dan riwayat percakapan.
