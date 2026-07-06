# Instruksi AGENTS

## Migrasi Prisma (Wajib)

- Jangan pernah menulis migrasi Prisma secara manual.
- Jangan pernah membuat atau mengedit `migration.sql` secara manual.
- Selalu hasilkan migrasi dengan Prisma CLI saja.

Gunakan pola perintah ini:

```bash
pnpm --filter backend prisma:migrate -- --name <nama_migrasi>
```

Jika pembuatan migrasi gagal (DB tidak tersedia, error engine schema, izin, dll.):

- Berhenti dan laporkan pemblokir.
- Jangan buat migrasi manual sebagai workaround.

## Keamanan Raw SQL Prisma (Wajib)

- Jangan pernah gunakan `this.prisma.$executeRaw`, `this.prisma.$queryRaw`, `this.prisma.$executeRawUnsafe`, atau `this.prisma.$queryRawUnsafe` dalam kode aplikasi.
- Utamakan metode ORM Prisma (`findMany`, `update`, `updateMany`, `createMany`, dll.).
- Jika Anda merasa raw SQL benar-benar diperlukan, berhenti dan minta persetujuan eksplisit terlebih dahulu.
