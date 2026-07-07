import {
  ApartmentOutlined,
  ArrowRightOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import { Button, Card, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Paragraph, Title } = Typography

const LEADS_BENEFITS = [
  {
    icon: <TagsOutlined className='text-lg' />,
    title: 'Identifikasi dengan cepat kontak prioritas Anda',
    description:
      'Temukan di satu tempat percakapan yang perlu diikuti, permintaan panas, dan orang yang perlu diingatkan.',
  },
  {
    icon: <ApartmentOutlined className='text-lg' />,
    title: 'Ikuti tindakan berikutnya tanpa kehilangan jejak',
    description:
      'Halaman Leads akan membantu Anda memvisualisasikan langkah-langkah penting, dari kontak pertama hingga konversi.',
  },
  {
    icon: <TeamOutlined className='text-lg' />,
    title: 'Pantau peluang Anda dengan jelas',
    description:
      'Label Anda akan tetap menjadi dasar untuk mengatur percakapan dengan lebih baik dan menghemat waktu setiap hari.',
  },
]

export function meta() {
  return [
    { title: 'Leads - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Halaman Leads dashboard WhatsApp Agent',
    },
  ]
}

export default function LeadsPage() {
  const navigate = useNavigate()

  return (
    <>
      <DashboardHeader title='Leads' />

      <div className='flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6'>
        <Card className='overflow-hidden' styles={{ body: { padding: 0 } }}>
          <div className='relative overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#111b21_0%,#153b2b_55%,#24d366_100%)] px-6 py-7 text-white sm:px-8 sm:py-8'>
            <div className='absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/8 blur-2xl' />
            <div className='absolute bottom-0 left-0 h-28 w-28 -translate-x-10 translate-y-10 rounded-full bg-black/15 blur-2xl' />

            <div className='relative flex flex-col gap-4'>
              <div className='max-w-3xl'>
                <Title level={3} className='!mb-2 !text-white'>
                  Temukan di sini segera percakapan yang perlu diprioritaskan.
                </Title>
                <Paragraph className='!mb-0 !text-white/80'>
                  Anda akan menemukan kontak yang perlu diingatkan, peluang
                  aktif, dan percakapan yang perlu ditangani lebih dulu. Sementara
                  itu, Anda sudah dapat mengatur label dan memberi tahu kami apa
                  yang paling berguna bagi Anda.
                </Paragraph>
              </div>

              <div className='flex flex-col gap-3 sm:flex-row'>
                <Button
                  type='primary'
                  shape='round'
                  icon={<ArrowRightOutlined />}
                  iconPosition='end'
                  onClick={() =>
                    navigate('/support', {
                      state: {
                        category: 'amelioration',
                        subject: 'Kebutuhan seputar halaman Leads',
                      },
                    })
                  }
                >
                  Beri tahu kami kebutuhan Anda
                </Button>
                <Button
                  shape='round'
                  className='!border-white/30 !bg-white/10 !text-white'
                  onClick={() => navigate('/context')}
                >
                  Atur label saya
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className='grid grid-cols-1 gap-4 lg:grid-cols-3'>
          {LEADS_BENEFITS.map(step => (
            <Card
              key={step.title}
              className='h-full'
              styles={{ body: { padding: 24 } }}
            >
              <div className='flex h-full flex-col gap-4'>
                <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#178f57]'>
                  {step.icon}
                </div>
                <div>
                  <Title level={5} className='!mb-2'>
                    {step.title}
                  </Title>
                  <Paragraph className='!mb-0 text-[#5b5b5b]'>
                    {step.description}
                  </Paragraph>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
