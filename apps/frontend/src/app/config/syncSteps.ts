/**
 * Konfigurasi langkah sinkronisasi WhatsApp
 * Pemetaan langkah dengan judul dan deskripsinya untuk UI
 */

export interface SyncStepConfig {
  title: string
  description: string
}

export const SYNC_STEPS_CONFIG: Record<
  'clientInfo' | 'catalog',
  SyncStepConfig
> = {
  clientInfo: {
    title: 'Sinkronisasi profil',
    description:
      'Kami mengambil informasi akun WhatsApp Business Anda: nama profil, avatar, informasi perusahaan (deskripsi, jam operasional, kategori, kontak).',
  },
  catalog: {
    title: 'Pengambilan katalog',
    description:
      'Kami menyinkronkan katalog produk Anda: koleksi, produk, deskripsi, harga, dan gambar. Langkah ini bisa memakan waktu beberapa menit tergantung ukuran katalog Anda.',
  },
}

/**
 * Get the display info for a sync step
 */
export function getSyncStepInfo(
  step: 'clientInfo' | 'catalog'
): SyncStepConfig {
  return SYNC_STEPS_CONFIG[step]
}
