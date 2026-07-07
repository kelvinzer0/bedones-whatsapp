import {
  ArrowRightOutlined,
  MessageOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import {
  AgentProductionCard,
  AgentTestCard,
} from '@app/components/agent-config'
import {
  GoogleBrandIcon,
  FacebookBrandIcon,
} from '@app/components/icons/BrandIcons'
import { useAuth } from '@app/hooks/useAuth'
import { getPlanLabel, resolveCurrentPlanKey } from '@app/lib/current-plan'
import apiClient from '@app/lib/api/client'
import { DashboardHeader } from '@app/components/layout'
import { App, Button, Card, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Link } = Typography

export function meta() {
  return [
    { title: 'Beranda - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Dashboard WhatsApp Agent',
    },
  ]
}

export default function DashboardPage() {
  const { user, checkAuth } = useAuth()
  const { notification } = App.useApp()
  const navigate = useNavigate()
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false)
  const googleContacts = user?.googleContacts
  const currentPlanLabel = getPlanLabel(resolveCurrentPlanKey(user))

  const openModerator = () => {
    if (typeof window === 'undefined') return

    window.open(
      'https://moderator.bedones.com',
      '_blank',
      'noopener,noreferrer'
    )
  }

  const handleConnectGoogle = async () => {
    setGoogleConnectLoading(true)

    try {
      const response = await apiClient.post('/google-contacts/oauth/authorize-url')
      const authorizeUrl = response?.data?.authorizeUrl

      if (!authorizeUrl) {
        throw new Error('URL otorisasi Google tidak ditemukan.')
      }

      window.location.assign(authorizeUrl)
    } catch (error) {
      console.error('Failed to start Google OAuth:', error)
      notification.error({
        message: 'Koneksi Google tidak dapat dilakukan',
        description:
          error instanceof Error
            ? error.message
            : 'Alur OAuth Google gagal.',
      })
      setGoogleConnectLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)
    const status = url.searchParams.get('googleContacts')
    const message = url.searchParams.get('message')

    if (!status) return

    if (status === 'connected') {
      notification.success({
        message: 'Google Contacts terhubung',
      })
      void checkAuth()
    } else {
      notification.error({
        message: 'Koneksi Google gagal',
        description: message || 'Callback Google tidak berhasil.',
      })
    }

    url.searchParams.delete('googleContacts')
    url.searchParams.delete('message')

    navigate(
      {
        pathname: url.pathname,
        search: url.searchParams.toString()
          ? `?${url.searchParams.toString()}`
          : '',
      },
      { replace: true }
    )
  }, [checkAuth, navigate, notification])

  return (
    <>
      <DashboardHeader title='Beranda' />

      <div className='flex w-full flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6 card-button-bottom'>
        <section>
          <Title level={5} className='mb-4'>
            Uji coba atau beralih ke produksi
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <AgentTestCard />
            <AgentProductionCard />
          </div>
        </section>

        <section>
          <Title level={5} className='mb-4'>
            Penggunaan dan paket
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100'>
                    <MessageOutlined className='text-lg' />
                  </div>
                  <Button
                    type='default'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={() => navigate('/stats')}
                  >
                    Lihat detail
                  </Button>
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    50 pesan diproses hari ini
                  </Text>
                  <Text type='secondary'>
                    Lihat lebih banyak detail dari halaman statistik
                  </Text>
                </div>
              </div>
            </Card>

            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100'>
                    <RiseOutlined className='text-lg' />
                  </div>
                  <Button
                    type='primary'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={() => navigate('/pricing')}
                  >
                    Lihat langganan
                  </Button>
                </div>
                <div>
                  <div className='mb-1 flex items-center gap-2'>
                    <Text strong>Langganan</Text>
                    <span className='rounded-full bg-[#24d366] px-2.5 py-1 text-xs font-semibold text-black'>
                      {currentPlanLabel}
                    </span>
                  </div>
                  <Text type='secondary' className='block'>
                    AI akan membalas semua kontak kecuali kontak yang
                    dikecualikan. <Link>Kecualikan kontak</Link>
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <Title level={5} className='mb-4'>
            Alat
          </Title>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-12 w-12 items-center justify-center'>
                    <GoogleBrandIcon className='h-10 w-10' />
                  </div>
                  {googleContacts?.connected ? (
                    <span className='rounded-full bg-[#24d366] px-3 py-1 text-sm font-semibold text-black'>
                      {googleContacts.contactsCount} kontak tersimpan
                    </span>
                  ) : (
                    <Button
                      type='default'
                      shape='round'
                      icon={<ArrowRightOutlined />}
                      iconPosition='end'
                      loading={googleConnectLoading}
                      onClick={handleConnectGoogle}
                    >
                      Hubungkan
                    </Button>
                  )}
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    Google Contacts
                  </Text>
                  <Text type='secondary'>
                    {googleContacts?.connected
                      ? 'Kontak WhatsApp baru otomatis disimpan di Google.'
                      : 'Simpan otomatis kontak WhatsApp baru di Google.'}
                  </Text>
                </div>
              </div>
            </Card>

            <Card
              className='h-full'
              styles={{
                body: { padding: 24 },
              }}
            >
              <div className='flex w-full flex-col gap-4'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                  <div className='flex h-12 w-12 items-center justify-center'>
                    <FacebookBrandIcon className='h-10 w-10' />
                  </div>
                  <Button
                    type='default'
                    shape='round'
                    icon={<ArrowRightOutlined />}
                    iconPosition='end'
                    onClick={openModerator}
                  >
                    Hubungkan
                  </Button>
                </div>
                <div>
                  <Text strong className='mb-1 block'>
                    Facebook
                  </Text>
                  <Text type='secondary'>
                    Balas otomatis komentar di halaman Anda
                  </Text>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  )
}
