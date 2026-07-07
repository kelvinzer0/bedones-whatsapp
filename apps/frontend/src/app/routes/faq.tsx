import {
  CustomerServiceOutlined,
  FileImageOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  ShoppingOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import { CollapsibleCard } from '@app/components/ui'
import { useMemo, useState, type ReactNode } from 'react'

type FaqItem = {
  key: string
  category: string
  question: string
  answer: string[]
}

const FAQ_ITEMS: FaqItem[] = [
  // ── Katalog & Produk ──
  {
    key: 'catalogue-retailer-id',
    category: 'Katalog & Produk',
    question: 'Bagaimana cara menentukan Retailer ID produk saya dengan baik?',
    answer: [
      'Retailer ID adalah pengidentifikasi unik yang Anda berikan untuk setiap produk di katalog WhatsApp Business Anda. Pilih kode yang pendek, mudah diingat, dan tidak ambigu, misalnya "SNK-AF1-BLC" daripada nomor panjang yang dihasilkan secara otomatis.',
      'Kode ini harus tetap unik di seluruh katalog Anda. Kode ini digunakan oleh agent untuk mengidentifikasi artikel secara tepat ketika klien menyebutkannya dalam percakapan.',
    ],
  },
  {
    key: 'catalogue-retailer-id-usage',
    category: 'Katalog & Produk',
    question: 'Bagaimana cara menggunakan Retailer ID di postingan saya?',
    answer: [
      'Cantumkan Retailer ID di stories, postingan, dan visual produk Anda agar klien dapat menyalinnya ke percakapan WhatsApp.',
      'Ketika agent mendeteksi Retailer ID yang dikenal dalam pesan, agent akan menemukan produk yang sesuai secara otomatis dan dapat mengirimkannya ke klien tanpa langkah tambahan.',
    ],
  },
  {
    key: 'catalogue-sync',
    category: 'Katalog & Produk',
    question: 'Bagaimana cara menyinkronkan katalog WhatsApp saya dengan dashboard?',
    answer: [
      'Gunakan tombol "Paksa sinkronisasi" di halaman Katalog. Sistem akan mengambil koleksi dan produk Anda langsung dari WhatsApp Business, memperbarui basis data, dan mengindeks gambar untuk pencarian berdasarkan kemiripan.',
      'Sinkronisasi juga memproses gambar: gambar disimpan, dipotong secara cerdas, dan divectorize untuk memungkinkan pengenalan visual produk Anda.',
    ],
  },
  {
    key: 'catalogue-collections',
    category: 'Katalog & Produk',
    question: 'Apa fungsi koleksi dan bagaimana agent menggunakannya?',
    answer: [
      'Koleksi mengelompokkan produk Anda berdasarkan tema atau kategori di WhatsApp Business. Agent dapat mengirim seluruh koleksi ke klien yang mencari jenis artikel tertentu, atau tautan lengkap katalog Anda.',
      'Semakin terorganisir deskripsi dan koleksi Anda, semakin relevan dan cepat rekomendasi agent.',
    ],
  },

  // ── Media yang didukung ──
  {
    key: 'media-images',
    category: 'Media yang didukung',
    question: 'Apa yang terjadi ketika klien mengirim gambar?',
    answer: [
      'Agent menganalisis gambar dalam beberapa langkah: ekstraksi teks (OCR) untuk mendeteksi Retailer ID yang mungkin ada, perbandingan visual berdasarkan kemiripan gambar dengan katalog Anda yang diindeks, dan deskripsi cerdas melalui Gemini Vision.',
      'Jika produk yang sesuai ditemukan di katalog Anda, agent akan langsung menawarkannya ke klien. Jika tidak, agent menggunakan deskripsi yang dihasilkan untuk lebih memahami permintaan dan merumuskan jawaban yang sesuai.',
    ],
  },
  {
    key: 'media-audio',
    category: 'Media yang didukung',
    question: 'Apakah agent dapat memahami pesan suara?',
    answer: [
      'Ya. Setiap pesan suara yang diterima secara otomatis ditranskripsi menggunakan Gemini 2.5. Agent mendapatkan teks persis dari apa yang dikatakan klien, lalu menalarinya seperti pesan teks biasa.',
      'Transkripsi berfungsi dalam bahasa klien dan mendukung catatan suara serta file audio yang dikirim sebagai lampiran.',
    ],
  },
  {
    key: 'media-video',
    category: 'Media yang didukung',
    question: 'Apakah video didukung?',
    answer: [
      'Tidak, video belum dianalisis oleh agent. Jika klien mengirim video, agent tidak akan dapat mengekstrak kontennya.',
      'Jika klien Anda perlu membagikan produk dalam bentuk video, sarankan untuk mengirim tangkapan layar atau foto produk yang akan dianalisis secara normal.',
    ],
  },

  // ── Pemrosesan pesan ──
  {
    key: 'messages-delai',
    category: 'Pemrosesan pesan',
    question: 'Berapa lama agent merespons suatu pesan?',
    answer: [
      'Waktu respons bervariasi antara 5 hingga 30 detik tergantung jenis pesan. Pesan teks sederhana diproses lebih cepat daripada gambar yang memerlukan OCR, kemiripan visual, dan deskripsi oleh AI.',
      'Pesan suara menambahkan langkah transkripsi yang dapat sedikit memperpanjang waktu, namun respons tetap umumnya di bawah 20 detik.',
    ],
  },
  {
    key: 'messages-admin-group',
    category: 'Pemrosesan pesan',
    question: 'Bagaimana cara kerja grup administrasi?',
    answer: [
      'Ketika agent mendeteksi situasi yang memerlukan intervensi manusia (permintaan kompleks, keluhan, permintaan pengembalian dana...), agent akan otomatis memindahkan percakapan ke grup administrasi WhatsApp Anda.',
      'Pesan yang dipindahkan menyertakan nomor kontak dan ringkasan situasi, agar tim Anda dapat segera mengambil alih tanpa kehilangan konteks.',
    ],
  },
  {
    key: 'messages-relances',
    category: 'Pemrosesan pesan',
    question: 'Apakah agent dapat menjadwalkan pengingat otomatis?',
    answer: [
      'Ya. Agent dapat menjadwalkan "niat" cerdas, misalnya mengingatkan klien dalam 48 jam jika tidak merespons. Pada waktu yang dijadwalkan, agent terlebih dahulu memeriksa kondisi (apakah klien sudah merespons?), lalu bertindak sesuai itu.',
      'Anda dapat melihat pengingat yang tertunda dan membatalkannya jika konteksnya berubah. Jenis yang tersedia mencakup tindak lanjut, pengingat pesanan, pengingat pembayaran, dan pembaruan pengiriman.',
    ],
  },
  {
    key: 'messages-labels',
    category: 'Pemrosesan pesan',
    question: 'Bagaimana agent mengklasifikasikan kontak saya?',
    answer: [
      'Agent menggunakan sistem label WhatsApp untuk mengkategorikan kontak Anda secara otomatis berdasarkan percakapan: prospek panas, pesanan sedang berjalan, klien setia, dll.',
      'Anda menentukan label di WhatsApp Business, dan agent akan menerapkan atau menghapusnya sepanjang percakapan. Label ini juga akan menjadi dasar untuk halaman Leads di masa depan.',
    ],
  },

  // ── Stories & Pemasaran ──
  {
    key: 'stories-frequence',
    category: 'Stories & Pemasaran',
    question: 'Berapa banyak stories yang dipublikasikan per hari?',
    answer: [
      'Kami merekomendasikan memublikasikan 4 hingga 5 stories per hari. Lebih dari itu, kontak Anda akan melihat progress bar yang panjang dan cenderung melewatkan profil Anda tanpa menonton.',
      'Lebih baik memublikasikan lebih sedikit stories namun tertarget, daripada terlalu banyak dengan risiko membosankan audiens Anda.',
    ],
  },
  {
    key: 'stories-ligne-editoriale',
    category: 'Stories & Pemasaran',
    question: 'Berapa banyak topik yang dibahas dalam stories saya?',
    answer: [
      'Pertahankan satu jalur komunikasi per hari. Jika Anda mencampur promosi, tutorial, dan pengumuman dalam rangkaian stories yang sama, pesan menjadi kurang jelas dan engagement menurun.',
      'Pilih satu tema unik per hari (misalnya, menyorot produk, tip penggunaan, atau testimoni klien) dan tetap konsisten dari awal hingga akhir.',
    ],
  },
  {
    key: 'stories-scheduler',
    category: 'Stories & Pemasaran',
    question: 'Bagaimana cara menggunakan penjadwal stories?',
    answer: [
      'Penjadwal memungkinkan Anda memprogram di muka status teks atau gambar pada kalender bulanan. Anda memilih tanggal, waktu, dan konten, dan publikasi dilakukan secara otomatis.',
      'Anda dapat melihat publikasi terjadwal, mengubah jadwal, atau menghapus status kapan saja dari kalender.',
    ],
  },

  // ── Onboarding & Pengaturan ──
  {
    key: 'onboarding-demarrage',
    category: 'Onboarding & Pengaturan',
    question: 'Bagaimana cara memulai dengan WhatsApp Agent?',
    answer: [
      'Mulailah dengan menghubungkan nomor WhatsApp Anda dari layar koneksi dengan kode pairing. Kemudian lengkapi konteks AI melalui halaman onboarding untuk mendeskripsikan aktivitas, produk, dan instruksi Anda.',
      'Skor konteks berfungsi sebagai pengaman: selama belum mencapai 80%, agent tidak diaktifkan di production. Semakin banyak informasi akurat yang Anda berikan, semakin baik skornya.',
    ],
  },
  {
    key: 'onboarding-parametres',
    category: 'Onboarding & Pengaturan',
    question: 'Pengaturan apa yang dapat saya konfigurasikan untuk aktivitas saya?',
    answer: [
      'Dari pengaturan, Anda dapat mengisi informasi perusahaan Anda, mengelola zona pengiriman, dan mengonfigurasi metode pembayaran yang diterima.',
      'Informasi ini digunakan oleh agent untuk menjawab pertanyaan umum klien tentang pengiriman dan pembayaran, tanpa Anda perlu campur tangan.',
    ],
  },
  {
    key: 'onboarding-stats',
    category: 'Onboarding & Pengaturan',
    question: 'Bagaimana cara membaca statistik dashboard?',
    answer: [
      'Halaman Statistik membandingkan pesan dan percakapan Anda dalam periode yang dipilih untuk mengidentifikasi perubahan penting dan mengikuti aktivitas agent Anda.',
      'Delta dan grafik memberi Anda gambaran umum tren. Gunakan untuk memverifikasi bahwa agent menangani volume yang diharapkan.',
    ],
  },

  // ── Dukungan & Langganan ──
  {
    key: 'support-feedback',
    category: 'Dukungan & Langganan',
    question: 'Bagaimana cara melaporkan bug atau mengirim masukan?',
    answer: [
      'Halaman Dukungan memiliki formulir yang terhubung ke Sentry untuk mempusatkan masukan Anda. Pilih kategori (bug, pertanyaan produk, permintaan pengembangan, atau upgrade), lalu deskripsikan situasi Anda.',
      'Formulir akan otomatis mengirim beberapa metadata berguna seperti halaman saat ini dan paket Anda, agar tim dapat mereproduksi masalah dengan lebih mudah.',
    ],
  },
  {
    key: 'support-forfaits',
    category: 'Dukungan & Langganan',
    question: 'Di mana membandingkan paket yang berbeda?',
    answer: [
      'Halaman Paket menampilkan penawaran yang tersedia dengan ringkasan fitur yang disertakan, penggunaan yang ditargetkan, dan tarif sesuai durasi komitmen yang dipilih.',
      'Jika paket Anda saat ini diketahui, paket tersebut akan otomatis disorot. Anda dapat menghubungi dukungan langsung dari halaman ini untuk mengubah paket.',
    ],
  },
  {
    key: 'support-leads',
    category: 'Dukungan & Langganan',
    question: 'Apa fungsi halaman Leads?',
    answer: [
      'Halaman Leads akan segera mengumpulkan percakapan yang perlu diikuti, pengingat penting, dan peluang yang sedang berjalan untuk memberi Anda tampilan CRM yang disederhanakan.',
      'Label yang diterapkan agent secara otomatis akan menjadi dasar untuk mengurutkan kontak Anda dan memprioritaskan tindakan komersial.',
    ],
  },
]

const CATEGORY_ICON: Record<string, ReactNode> = {
  'Katalog & Produk': <ShoppingOutlined />,
  'Media yang didukung': <FileImageOutlined />,
  'Pemrosesan pesan': <MessageOutlined />,
  'Stories & Pemasaran': <RocketOutlined />,
  'Onboarding & Pengaturan': <QuestionCircleOutlined />,
  'Dukungan & Langganan': <CustomerServiceOutlined />,
}

export function meta() {
  return [
    { title: 'FAQ - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Pertanyaan umum dashboard WhatsApp Agent dengan bagian yang dapat dilipat',
    },
  ]
}

export default function FaqPage() {
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const groupedItems = useMemo(() => {
    return FAQ_ITEMS.reduce<Record<string, FaqItem[]>>((groups, item) => {
      const entry = groups[item.category] || []
      entry.push(item)
      groups[item.category] = entry
      return groups
    }, {})
  }, [])

  const toggleItem = (itemKey: string, expanded: boolean) => {
    setExpandedItems(previous => {
      if (expanded) {
        return previous.includes(itemKey) ? previous : [...previous, itemKey]
      }

      return previous.filter(key => key !== itemKey)
    })
  }

  return (
    <>
      <DashboardHeader title='FAQ' />

      <div className='w-full space-y-6 px-4 py-5 sm:px-6 sm:py-6'>
        {Object.entries(groupedItems).map(([category, items]) => (
          <section key={category} className='space-y-3'>
            <div className='flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]'>
              <span className='inline-flex h-6 w-6 items-center justify-center text-base'>
                {CATEGORY_ICON[category] || <QuestionCircleOutlined />}
              </span>
              <span>{category}</span>
            </div>

            <div className='merge-border-radius grid gap-2'>
              {items.map(item => (
                <CollapsibleCard
                  key={item.key}
                  title={item.question}
                  subtitle={item.answer.join('\n')}
                  expanded={expandedItems.includes(item.key)}
                  hideSubtitleWhenExpanded
                  onToggle={expanded => toggleItem(item.key, expanded)}
                >
                  <div className='space-y-3'>
                    {item.answer.map(paragraph => (
                      <p
                        key={paragraph}
                        className='m-0 text-sm leading-[1.75] text-[var(--color-text-secondary)]'
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </CollapsibleCard>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
