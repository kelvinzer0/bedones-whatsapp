import {
  ClockCircleOutlined,
  SaveOutlined,
  TeamOutlined,
  TagOutlined,
  MessageOutlined,
  DollarOutlined,
  CarOutlined,
  FieldTimeOutlined,
  CommentOutlined,
} from '@ant-design/icons'
import type { ComponentType } from 'react'

export interface FeatureItem {
  title: string
  icon: ComponentType
  description: string
}

export interface FeatureCategory {
  title: string
  features: FeatureItem[]
}

export const featuresConfig: Record<string, FeatureCategory> = {
  marketing: {
    title: 'Penjadwal status',
    features: [
      {
        title: 'Tindak lanjut klien jika perlu',
        icon: ClockCircleOutlined,
        description:
          'Jika dalam percakapan klien mengatakan akan kembali kepada Anda pada hari Senin misalnya, IA kami mengirim pesan tindak lanjut secara otomatis pada hari Senin.',
      },
      {
        title: 'Penyimpanan kontak otomatis',
        icon: SaveOutlined,
        description:
          'Anda dapat menghubungkan akun Google Anda dan kami akan menyimpan kontak di sana secara otomatis agar mereka dapat melihat status dan kehadiran Anda di WhatsApp.',
      },
      {
        title: 'Klasifikasi kontak',
        icon: TeamOutlined,
        description:
          'IA mengorganisir kontak Anda ke dalam kategori cerdas: prospek panas, klien setia, klien tidak aktif, spam, dll. Segmentasi otomatis ini membantu Anda menargetkan kampanye pemasaran dengan presisi.',
      },
      {
        title: 'Status per segmen pengguna',
        icon: TagOutlined,
        description:
          'Untuk menghindari publikasi sejumlah besar status, IA kami memungkinkan Anda memilih segmen kontak yang ingin Anda tuju dengan publikasi.',
      },
    ],
  },
  ventes: {
    title: 'Penjualan',
    features: [
      {
        title: 'Jawaban atas pertanyaan',
        icon: MessageOutlined,
        description:
          'IA menjawab pertanyaan klien Anda secara instan 24/7 berdasarkan instruksi Anda, deskripsi produk Anda, dan kebijakan penjualan Anda. IA memahami konteks dan memberikan jawaban yang tepat dan dipersonalisasi sesuai nada dan citra merek Anda.',
      },
      {
        title: 'Negosiasi harga sesuai aturan Anda',
        icon: DollarOutlined,
        description:
          'Tentukan aturan negosiasi Anda (diskon maksimal, syarat, volume) dan IA mengelola diskusi tarif secara mandiri. IA tahu kapan harus menawarkan promosi, bundel, atau meneruskan ke manusia.',
      },
      {
        title: 'Permintaan informasi pengiriman',
        icon: CarOutlined,
        description:
          'Agent secara otomatis mengumpulkan semua informasi yang diperlukan untuk pengiriman: alamat lengkap, preferensi waktu, instruksi khusus. IA memvalidasi data dan bahkan dapat menawarkan opsi pengiriman ekspres atau standar.',
      },
      {
        title: 'Notifikasi dalam grup',
        icon: CarOutlined,
        description:
          'IA kami mampu memahami grup tempat rekan kerja Anda berada dan memberi tahu mereka saat diperlukan (Pesanan baru, Permintaan penawaran, Permintaan retur, dll)',
      },
      {
        title: 'Tersedia 24 jam sehari, 7 hari seminggu',
        icon: FieldTimeOutlined,
        description:
          'Asisten IA Anda tidak pernah tidur. IA menjawab klien Anda secara instan, tanpa memandang waktu atau hari. Tangkap penjualan bahkan di malam hari, akhir pekan, dan hari libur tanpa biaya tambahan.',
      },
    ],
  },
  community: {
    title: 'Manajemen komunitas',
    features: [
      {
        title: 'Balasan atas komentar',
        icon: CommentOutlined,
        description:
          'IA kami dapat terhubung ke halaman Facebook atau Instagram Anda dan membalas komentar klien Anda secara real-time.',
      },
      {
        title: 'Deteksi pencurian leads',
        icon: TagOutlined,
        description:
          'IA kami dapat terhubung ke halaman Facebook atau Instagram Anda dan menyembunyikan/menghapus komentar yang mencoba membajak calon klien Anda.',
      },
      {
        title: 'Deteksi komentar berbahaya',
        icon: TagOutlined,
        description:
          'IA kami dapat terhubung ke halaman Facebook atau Instagram Anda dan menyembunyikan/menghapus komentar yang tidak pantas (hinaan, ancaman, dll).',
      },
    ],
  },
}
