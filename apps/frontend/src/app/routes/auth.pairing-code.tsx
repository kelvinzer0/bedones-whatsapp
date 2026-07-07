import { CheckCircleOutlined } from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { trackFirstLoginSignUp } from '@app/lib/analytics/google-analytics'
import apiClient from '@app/lib/api/client'
import { App, Card, Typography, Steps, Button } from 'antd'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography

interface LocationState {
  phoneNumber: string
  code: string
  pairingToken: string
}

export function meta() {
  return [
    { title: 'Kode pairing - WhatsApp Agent' },
    { name: 'description', content: 'Masukkan kode pairing WhatsApp Anda' },
  ]
}

export default function PairingCodePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notification } = App.useApp()
  const { login } = useAuth()
  const [isConfirming, setIsConfirming] = useState(false)
  const [pairingCompleted, setPairingCompleted] = useState(false)
  const [useManualPairing, setUseManualPairing] = useState(false)
  const [isExpired, setIsExpired] = useState(false)

  const state = location.state as LocationState

  // Redirect if no code/phone number/pairingToken
  useEffect(() => {
    if (!state?.code || !state?.phoneNumber || !state?.pairingToken) {
      notification.error({
        message: 'Kesalahan',
        description: 'Informasi pairing tidak lengkap',
      })
      navigate('/auth/login')
    }
  }, [state, navigate, notification])

  // Timer de 5 minutes pour expiration du code
  useEffect(() => {
    const timer = setTimeout(
      () => {
        if (!pairingCompleted) {
          setIsExpired(true)
        }
      },
      5 * 60 * 1000
    ) // 5 minutes en millisecondes

    return () => clearTimeout(timer)
  }, [pairingCompleted])

  // Handle user confirming they've completed pairing
  const handleConfirmPairing = async () => {
    if (!state?.pairingToken) {
      notification.error({
        message: 'Kesalahan',
        description: 'Token pairing tidak ditemukan',
      })
      return
    }

    setIsConfirming(true)

    try {
      const response = await apiClient.post('/auth/confirm-pairing', {
        pairingToken: state.pairingToken,
      })

      // Save user data (cookie is set by backend)
      if (response.data.accessToken) {
        trackFirstLoginSignUp({
          authFlow: 'pairing',
          isFirstLogin: Boolean(response.data.isFirstLogin),
          userId: response.data.user?.id,
        })
        login(response.data.user)
      }

      setPairingCompleted(true)

      notification.success({
        message: 'Berhasil masuk',
        description: 'Akun WhatsApp Anda telah berhasil ditautkan',
      })

      // Navigate to onboarding
      setTimeout(() => {
        navigate('/onboarding/import')
      }, 1500)
    } catch (error: any) {
      console.error('Error confirming pairing:', error)

      notification.error({
        message: 'Kesalahan',
        description:
          error.response?.data?.message ||
          'Terjadi kesalahan saat konfirmasi. Pastikan Anda telah memasukkan kode di WhatsApp.',
      })
    } finally {
      setIsConfirming(false)
    }
  }

  if (!state?.code) {
    return null
  }

  // Format code with spaces for better readability (e.g., "1234 5678")
  const formattedCode = state.code.match(/.{1,4}/g)?.join(' ') || state.code

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4'>
      <Card className='max-w-2xl w-full shadow-xl'>
        {isExpired ? (
          // Écran d'expiration
          <div className='text-center py-12'>
            <div className='mb-6'>
              <svg
                className='mx-auto h-24 w-24 text-orange-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <Title level={2} className='mb-4'>
              Kode kedaluwarsa
            </Title>
            <Paragraph className='text-lg text-gray-600 mb-8'>
              Kode pairing telah kedaluwarsa setelah 5 menit tidak aktif.
              <br />
              Silakan buat kode baru untuk melanjutkan.
            </Paragraph>
            <Button
              type='primary'
              size='large'
              onClick={() => navigate('/auth/login')}
            >
              Buat kode baru
            </Button>
          </div>
        ) : (
          <>
            <div className='text-center mb-8'>
              <Title level={2} className='mb-2'>
                Konfirmasi untuk {state?.phoneNumber}
              </Title>
              <Link
                to='/auth/login'
                className='text-blue-500 hover:text-blue-600'
              >
                Ubah nomor ini
              </Link>
            </div>

            {/* Pairing Code Display */}
            <div className='bg-green-50 border-2 border-green-200 rounded-lg p-8 mb-8 text-center'>
              <div className='text-3xl font-bold text-green-600 tracking-widest font-mono'>
                {formattedCode}
              </div>
            </div>

            {/* Instructions */}
            <div className='mb-8'>
              <Title level={4} className='mb-4'>
                Instruksi:
              </Title>

              {!useManualPairing ? (
                // Default: Notification-based pairing
                <>
                  <Steps
                    direction='vertical'
                    current={pairingCompleted ? 3 : 2}
                    items={[
                      {
                        title: 'Buka notifikasi masuk yang diterima',
                        description: (
                          <>
                            Anda akan menerima notifikasi WhatsApp di
                            ponsel Anda.
                            <br />
                            <Button
                              variant={'link'}
                              color={'primary'}
                              className={'-ml-4'}
                              onClick={() => setUseManualPairing(true)}
                            >
                              Saya tidak menerima notifikasi
                            </Button>
                          </>
                        ),
                        status: 'finish',
                      },
                      {
                        title: 'Masukkan kode di bawah ini',
                        description: (
                          <>
                            Masukkan kode ini di WhatsApp:{' '}
                            <strong>{formattedCode}</strong>
                          </>
                        ),
                        status: pairingCompleted ? 'finish' : 'process',
                      },
                      {
                        title: 'Tekan tombol di bawah ini',
                        description:
                          'Setelah kode dimasukkan, klik "Saya selesai"',
                        status: pairingCompleted ? 'finish' : 'wait',
                        icon: pairingCompleted ? (
                          <CheckCircleOutlined />
                        ) : undefined,
                      },
                    ]}
                  />
                </>
              ) : (
                // Manual pairing with full steps
                <Steps
                  direction='vertical'
                  current={pairingCompleted ? 5 : 4}
                  items={[
                    {
                      title:
                        'Buka Pengaturan WhatsApp di ponsel Anda',
                      description:
                        'Ketuk tiga titik di kanan atas',
                      status: 'finish',
                    },
                    {
                      title: 'Perangkat terhubung',
                      description: 'Pilih "Perangkat terhubung"',
                      status: 'finish',
                    },
                    {
                      title: 'Hubungkan perangkat',
                      description: 'Tekan "Hubungkan perangkat"',
                      status: 'finish',
                    },
                    {
                      title: 'Hubungkan dengan nomor telepon',
                      description: 'Yang ada di bagian paling bawah',
                      status: 'finish',
                    },
                    {
                      title: 'Masukkan kode',
                      description: (
                        <>
                          Pilih "Hubungkan dengan nomor telepon" dan
                          masukkan kode ini: <strong>{formattedCode}</strong>
                        </>
                      ),
                      status: pairingCompleted ? 'finish' : 'process',
                      icon: pairingCompleted ? (
                        <CheckCircleOutlined />
                      ) : undefined,
                    },
                  ]}
                />
              )}
            </div>

            {/* Confirmation Button */}
            {!pairingCompleted && (
              <div className='text-center py-6 border-t border-gray-200'>
                <Paragraph className='text-base mb-4'>
                  Setelah Anda memasukkan kode di WhatsApp:
                </Paragraph>
                <Button
                  type='primary'
                  size='large'
                  loading={isConfirming}
                  onClick={handleConfirmPairing}
                  className='min-w-[200px]'
                >
                  {isConfirming ? 'Memverifikasi...' : 'Saya selesai'}
                </Button>
                <Text type='secondary' className='block mt-3 text-sm'>
                  Pastikan Anda telah memasukkan kode pairing sebelum mengeklik
                </Text>
                <div className='mt-4'>
                  <Button
                    type='default'
                    size='large'
                    onClick={() => navigate('/auth/login')}
                    className='min-w-[200px]'
                  >
                    Buat ulang kode
                  </Button>
                </div>
              </div>
            )}

            {/* Success State */}
            {pairingCompleted && (
              <div className='text-center py-6 border-t border-gray-200'>
                <CheckCircleOutlined className='text-5xl text-green-500 mb-4' />
                <Paragraph className='text-base mb-0 font-medium text-green-600'>
                  Berhasil masuk!
                </Paragraph>
                <Text type='secondary' className='text-sm'>
                  Mengalihkan ke onboarding...
                </Text>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
