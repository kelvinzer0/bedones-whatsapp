import LegalDocumentPage from '@app/components/legal/LegalDocumentPage'

export function meta() {
  return [
    { title: 'Kebijakan Privasi - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Lihat kebijakan privasi WhatsApp Agent dan Bedones.',
    },
  ]
}

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      eyebrow='Privasi'
      title='Kebijakan Privasi'
      introduction="Kebijakan ini menjelaskan bagaimana Bedones mengumpulkan, menggunakan, mengamankan, dan menyimpan data yang diproses di WhatsApp Agent, termasuk informasi yang disinkronkan dengan Google Contacts saat Anda mengaktifkan fitur ini."
      updatedAt='21 Maret 2026'
      sections={[
        {
          title: '1. Data yang relevan',
          paragraphs: [
            "Kami dapat memproses informasi akun Anda, nomor WhatsApp Business Anda, informasi profil terkait, pengaturan agen Anda, pesan yang diperlukan untuk pengoperasian layanan, serta data kontak yang Anda pilih untuk disinkronkan dengan Google Contacts.",
            "Saat sinkronisasi Google Contacts diaktifkan, kami dapat memproses nomor telepon, nama pengguna WhatsApp, nama tampilan, ID chat, dan jika tersedia, nama perusahaan Anda untuk membuat atau menautkan kontak di buku Google Anda.",
          ],
        },
        {
          title: '2. Tujuan pemrosesan',
          paragraphs: [
            "Data ini digunakan untuk mengautentikasi akses Anda, menjalankan agen WhatsApp, meningkatkan pengalaman manajemen bisnis, memungkinkan sinkronisasi opsional dengan Google Contacts, dan memberikan dukungan teknis untuk layanan.",
            "Kami hanya menggunakan data yang disinkronkan untuk menyediakan fitur yang diminta pengguna dan untuk menjaga konsistensi antara akun WhatsApp Agent Anda, basis data internal kami, dan buku Google Anda.",
          ],
        },
        {
          title: '3. Berbagi dan sub-pemrosesan',
          paragraphs: [
            "Data dapat diteruskan kepada penyedia yang diperlukan secara ketat untuk pelaksanaan layanan, termasuk infrastruktur hosting, layanan basis data, WhatsApp, dan Google saat Anda secara eksplisit mengizinkan integrasi ini.",
            "Token OAuth Google dienkripsi sebelum disimpan di infrastruktur kami. Kami tidak membagikan token ini dengan pengguna lain atau pihak ketiga yang tidak diperlukan untuk pengoperasian layanan.",
          ],
        },
        {
          title: '4. Penyimpanan dan keamanan',
          paragraphs: [
            "Kami menerapkan langkah teknis dan organisasi yang wajar untuk melindungi data dari akses tidak sah, kehilangan, atau perubahan. Akses dibatasi pada kebutuhan operasional layanan.",
            "Data disimpan selama diperlukan untuk pengoperasian akun Anda, kepatuhan terhadap kewajiban hukum kami, dan penanganan insiden. Anda dapat meminta penonaktifan sinkronisasi Google Contacts kapan saja.",
          ],
        },
        {
          title: '5. Hak Anda',
          paragraphs: [
            "Tunduk pada hukum yang berlaku, Anda dapat meminta akses, koreksi, penghapusan, atau pembatasan pemrosesan data Anda. Anda juga dapat menarik persetujuan Anda untuk integrasi opsional seperti Google Contacts dengan memutusnya dari aplikasi atau menghubungi Bedones.",
            "Jika Anda merasa data Anda tidak diproses sesuai harapan, Anda juga dapat menghubungi kami agar kami meninjau permintaan Anda.",
          ],
        },
      ]}
    />
  )
}
