import LegalDocumentPage from '@app/components/legal/LegalDocumentPage'

export function meta() {
  return [
    { title: 'Syarat dan Ketentuan - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Lihat syarat dan ketentuan WhatsApp Agent.',
    },
  ]
}

export default function TermsPage() {
  return (
    <LegalDocumentPage
      eyebrow='Syarat & Ketentuan'
      title='Syarat dan Ketentuan'
      introduction="Ketentuan ini mengatur akses dan penggunaan WhatsApp Agent. Dengan menggunakan aplikasi, Anda mengonfirmasi bahwa Anda bertindak untuk aktivitas Anda dan menerima penggunaan yang sesuai dengan hukum, aturan WhatsApp, dan ketentuan ini."
      updatedAt='21 Maret 2026'
      sections={[
        {
          title: '1. Tujuan layanan',
          paragraphs: [
            "WhatsApp Agent memungkinkan otomatisasi dan bantuan untuk interaksi bisnis tertentu di sekitar WhatsApp Business, termasuk pengelolaan konteks bisnis, bantuan percakapan, dan saat Anda mengaktifkannya, sinkronisasi kontak dengan layanan pihak ketiga.",
          ],
        },
        {
          title: '2. Akses dan akun',
          paragraphs: [
            "Anda bertanggung jawab atas informasi yang diberikan saat masuk, keamanan akun Anda, dan penggunaan nomor WhatsApp Business Anda, konfigurasi agen, dan integrasi pihak ketiga Anda.",
            "Anda harus memiliki hak yang diperlukan atas data, kontak, dan saluran yang Anda gunakan di aplikasi.",
          ],
        },
        {
          title: '3. Penggunaan yang diizinkan',
          paragraphs: [
            "Anda setuju untuk tidak menggunakan layanan untuk tujuan ilegal, curang, menipu, abusif, atau bertentangan dengan kebijakan platform yang terhubung. Anda tetap bertanggung jawab atas pesan, konten, aturan bisnis, dan otomatisasi yang dikonfigurasi dari akun Anda.",
            "Setiap penggunaan yang dapat merugikan layanan, pengguna lain kami, atau pihak ketiga dapat mengakibatkan penangguhan atau pembatasan akses.",
          ],
        },
        {
          title: '4. Integrasi pihak ketiga',
          paragraphs: [
            "Beberapa fitur bergantung pada layanan pihak ketiga, termasuk WhatsApp dan Google. Ketersediaan, aturan, dan ketentuan mereka dapat berubah tanpa pemberitahuan. Anda bertanggung jawab untuk mempertahankan izin yang diperlukan pada layanan ini.",
            "Saat Anda menghubungkan Google Contacts, Anda mengizinkan kami untuk membuat atau menautkan kontak di akun Google Anda sendiri sesuai aturan sinkronisasi yang ditentukan oleh aplikasi.",
          ],
        },
        {
          title: '5. Pembatasan dan evolusi layanan',
          paragraphs: [
            "Layanan disediakan dengan kewajiban sarana. Kami dapat mengoreksi, mengubah, menangguhkan, atau mengembangkan fitur tertentu karena alasan teknis, keamanan, kepatuhan, atau peningkatan produk.",
            "Kecuali ditentukan lain secara imperatif, Bedones tidak bertanggung jawab atas kerugian tidak langsung, gangguan yang disebabkan oleh pihak ketiga, atau konsekuensi konfigurasi yang disediakan oleh pengguna.",
          ],
        },
      ]}
    />
  )
}
