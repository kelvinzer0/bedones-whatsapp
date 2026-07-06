# Strategi Pemrosesan Gambar - WhatsApp Agent

## Gambaran Umum

Dokumen ini mendefinisikan flow pencocokan gambar produksi yang digunakan oleh WhatsApp agent.

Tujuan:
1. Identifikasi produk dari gambar kontak masuk dengan biaya minimal.
2. Berhenti lebih awal saat kecocokan yang yakin ditemukan.
3. Pertahankan satu sumber kebenaran untuk runtime webhook dan endpoint tes.

## Pipeline Runtime (sumber kebenaran tunggal)

Pipeline diimplementasikan di `ImageProductMatchingService` dan digunakan kembali oleh:
1. Handler gambar webhook (`ImageMessageHandlerService`)
2. Endpoint tes (`POST /test/image-pipeline`)

Urutan eksekusi:
1. OCR pada buffer gambar asli (tanpa crop sebelum OCR).
2. Ekstraksi kata kunci dari teks OCR.
3. Pencocokan retailer via backend `search-by-keywords` (retailer_id saja).
4. Jika tidak ada kecocokan:
   - Crop dengan OpenCV (`SmartCropService.cropOpenCV`)
   - Hasilkan embedding gambar CLIP lokal
   - Cari di Qdrant `product-images`
5. Jika masih tidak ada kecocokan:
   - Hasilkan deskripsi Gemini Vision
   - Hasilkan embedding teks Gemini dari deskripsi tersebut
   - Cari di Qdrant `product-text`
6. Bangun blok `[IMAGE_CONTEXT]` dan payload untuk konteks agent.

Aturan keras:
- Deskripsi Gemini Vision tidak dipanggil saat kecocokan retailer OCR atau kecocokan gambar Qdrant sudah berhasil.

## Metode Pencarian

Nilai `searchMethod` yang mungkin:
1. `ocr_keywords`
2. `qdrant_image`
3. `qdrant_text`
4. `none`
5. `error`

Payload yang dikembalikan berisi:
1. Teks OCR dan kata kunci yang diekstrak
2. Kata kunci yang cocok
3. Produk yang cocok
4. Confidence / similarity
5. Metadata crop
6. Payload konteks siap agent (`body`, `imageContextBlock`, dll.)

## Koleksi Qdrant

Koleksi:
1. `product-images` -> embedding gambar (model CLIP lokal)
2. `product-text` -> embedding teks (embedding teks Gemini)

Endpoint reset (dilindungi JWT internal):
- `POST /image-processing/reset-qdrant`

Perilaku:
1. Hapus kedua koleksi jika ada.
2. Buat ulang kedua koleksi dengan ukuran vektor yang dikonfigurasi.
3. Kembalikan nama koleksi dan dimensi.

## Pengindeksan Katalog

Perilaku pengindeksan `ProductImageIndexingService`:
1. Untuk koleksi gambar (`product-images`):
   - Unduh gambar
   - Hasilkan embedding gambar CLIP lokal
   - Indeks metadata varian gambar
2. Untuk koleksi teks (`product-text`):
   - Bangun teks dari name + description + cover description
   - Hasilkan embedding teks
   - Indeks metadata teks

Pembuatan deskripsi sampul oleh Gemini Vision hanya digunakan untuk pengayaan teks saat diperlukan.

## Aturan Pencarian Produk OCR

Pencarian kata kunci OCR backend hanya untuk retailer.

`ProductsService.searchByKeywords`:
1. Input: `userId`, `keywords`
2. Cocokkan hanya dengan `retailer_id`
3. Kembalikan produk yang cocok dan kata kunci yang cocok

Tidak ada pencocokan pada `name`, `description`, atau `category`.

## Endpoint Tes

Endpoint tes publik:
- `POST /test/image-pipeline`

Tujuan:
1. Jalankan pipeline produksi yang sama persis pada gambar yang diupload.
2. Kembalikan output pipeline lengkap untuk debugging dan iterasi.

Semua endpoint debug lama (endpoint terpisah OCR/Qdrant/crop) telah dihapus.

## Object Key Upload Gambar

Upload gambar katalog sekarang menyimpan file tanpa `collectionId` di path.

Format object key:
- `{agentId}/catalog/images/{userId}-{productId}-{imageIndex}.{ext}`

`collectionId` tidak lagi diperlukan dalam payload `POST /catalog/upload-image`.

## Variabel Lingkungan

Kunci umum:
1. `GEMINI_API_KEY`
2. `CLIP_IMAGE_MODEL` (default `Xenova/clip-vit-base-patch16`)
3. `GEMINI_VISION_MODEL`
4. `QDRANT_API_URL`
5. `QDRANT_API_KEY`
6. `QDRANT_IMAGE_COLLECTION` (default `product-images`)
7. `QDRANT_TEXT_COLLECTION` (default `product-text`)
8. `QDRANT_IMAGE_VECTOR_SIZE` (rekomendasi: selaraskan dengan dimensi output model gambar aktif)
9. `QDRANT_TEXT_VECTOR_SIZE` (default `768`)
10. `QDRANT_IMAGE_THRESHOLD`
11. `QDRANT_TEXT_THRESHOLD`
12. `IMAGE_CROPPER_URL`

## Checklist Penerimaan

1. OCR hanya-retailer mengembalikan kecocokan hanya saat retailer_id mengandung kata kunci OCR.
2. Jika kecocokan OCR berhasil, tidak ada panggilan fallback Qdrant atau Gemini Vision.
3. Jika OCR gagal dan Qdrant image berhasil, tidak ada panggilan deskripsi Gemini Vision.
4. Jika keduanya gagal, fallback Gemini Vision + Qdrant text dijalankan.
5. Output endpoint tes konsisten dengan perilaku webhook.
6. Endpoint reset Qdrant membuat ulang kedua koleksi.
7. Upload gambar katalog berfungsi tanpa `collectionId`.
