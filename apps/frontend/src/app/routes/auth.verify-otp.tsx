import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { trackFirstLoginSignUp } from '@app/lib/analytics/google-analytics'
import apiClient from '@app/lib/api/client'
import { App, Button, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const { Text, Link } = Typography

interface VerifyOtpResponse {
  accessToken: string
  isFirstLogin?: boolean
  redirectTo?: string
  user: {
    id: string
    phoneNumber: string
    status: string
    whatsappProfile?: { pushName?: string }
    contextScore?: number
  }
}

interface OtpFormValues {
  code: string
}

interface LocationState {
  phoneNumber?: string
  code?: string
  pairingToken?: string
  scenario?: 'pairing' | 'otp'
}

export function meta() {
  return [
    { title: 'Konfirmasi - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Konfirmasi kode Anda untuk masuk',
    },
  ]
}

export default function VerifyOtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notification } = App.useApp()
  const { login } = useAuth()
  const [form] = Form.useForm<OtpFormValues>()
  const [isVerifying, setIsVerifying] = useState(false)

  const state = location.state as LocationState
  const pairingToken = state?.pairingToken
  const scenario = state?.scenario || 'pairing' // Default to pairing for backward compatibility
  const isPairingScenario = scenario === 'pairing'
  const isOtpScenario = scenario === 'otp'

  const handleVerifyOtp = async (values?: OtpFormValues) => {
    if (!pairingToken) {
      notification.error({
        message: 'Kesalahan',
        description: 'Token sesi tidak ditemukan',
      })
      navigate('/auth/login')
      return
    }

    setIsVerifying(true)

    try {
      const response = await apiClient.post<VerifyOtpResponse>(
        '/auth/confirm-pairing',
        {
          pairingToken,
          otpCode: isOtpScenario && values ? values.code : undefined,
        }
      )

      // Save user data (cookie is set by backend)
      trackFirstLoginSignUp({
        authFlow: isOtpScenario ? 'otp' : 'pairing',
        isFirstLogin: Boolean(response.data.isFirstLogin),
        userId: response.data.user?.id,
      })
      login(response.data.user)

      notification.success({
        message: 'Berhasil masuk',
        description: 'Anda sekarang sudah masuk',
      })

      // Refresh user to get up-to-date context score (if not returned by confirm-pairing)
      let contextScore = response.data.user.contextScore
      let redirectTo = response.data.redirectTo

      try {
        const meResponse = await apiClient.get('/auth/me')
        if (meResponse.data) {
          login(meResponse.data)
          contextScore = meResponse.data.contextScore
        }
      } catch (meError) {
        console.warn('Failed to refresh user after login:', meError)
      }

      if (typeof contextScore === 'number') {
        redirectTo = contextScore < 80 ? '/context' : '/dashboard'
      }

      navigate(redirectTo || '/context')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      notification.error({
        message: 'Kesalahan',
        description: err.response?.data?.message || 'Kode tidak valid atau kedaluwarsa',
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleBack = () => {
    navigate('/auth/login')
  }

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-[#fdfdfd] px-4 py-8'>
      {/* Main Card */}
      <div className='w-full max-w-[719px]'>
        <div className='bg-white rounded-[28px] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.3)] p-1'>
          <div className='bg-white rounded-[24px] shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] overflow-hidden'>
            {/* Header */}
            <div className='bg-white pt-12 px-12 text-center'>
              <h1 className='text-2xl font-normal text-[#111b21] leading-[30px] mb-4'>
                {isPairingScenario
                  ? 'Sambungkan perangkat Anda'
                  : 'Masuk'}
              </h1>
              <div className='text-base text-[#494949] leading-6'>
                {isPairingScenario ? (
                  <>
                    <p className='mb-0'>
                      Pindai kode QR atau masukkan kode pairing di ponsel
                      WhatsApp Business Anda
                    </p>
                    <p className='mb-0 mt-2'>
                      Kode pairing: <strong>{state?.code}</strong>
                    </p>
                    <p className='mt-2'>
                      Jangan khawatir, kami tidak akan menjawab klien Anda apa
                      pun untuk saat ini
                    </p>
                  </>
                ) : (
                  <>
                    <p className='mb-0'>
                      Silakan buka percakapan{' '}
                      <strong>{state?.phoneNumber}</strong> (nomor Anda) di
                      aplikasi WhatsApp Anda
                    </p>
                    <p>dan masukkan di bawah ini kode yang ada di sana</p>
                  </>
                )}
              </div>
            </div>

            {/* OTP/Code Input */}
            {isOtpScenario && (
              <div className='px-12 py-8 flex justify-center'>
                <Form form={form} onFinish={handleVerifyOtp}>
                  <Form.Item
                    name='code'
                    rules={[
                      {
                        required: true,
                        message: 'Silakan masukkan kode',
                      },
                      {
                        len: 6,
                        message: 'Kode harus terdiri dari 6 digit',
                      },
                    ]}
                    className='mb-0'
                  >
                    <Input.OTP
                      length={6}
                      size='large'
                      style={{
                        width: '100%',
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          form.submit()
                        }
                      }}
                    />
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* Pairing waiting state */}
            {isPairingScenario && (
              <div className='px-12 py-8 flex justify-center'>
                <p className='text-sm text-[#494949] text-center'>
                  Menunggu konfirmasi di ponsel Anda...
                </p>
              </div>
            )}

            {/* Actions */}
            <div className='px-12 pb-12'>
              <div className='flex justify-center gap-3 mb-4'>
                <Button
                  type='default'
                  size='large'
                  onClick={handleBack}
                  className='h-[46px] w-[46px] px-4 rounded-full bg-white shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] border-none flex items-center justify-center'
                >
                  <ArrowLeftOutlined />
                </Button>
                {isOtpScenario && (
                  <Button
                    type='primary'
                    size='large'
                    onClick={() => form.submit()}
                    loading={isVerifying}
                    className='h-[46px] px-8 bg-[#24d366] border-none hover:bg-[#1fb855] flex items-center gap-2'
                  >
                    <span className='text-sm font-medium tracking-[0.35px]'>
                      Verifikasi kode
                    </span>
                    <ArrowRightOutlined />
                  </Button>
                )}
                {isPairingScenario && (
                  <Button
                    type='primary'
                    size='large'
                    onClick={() => handleVerifyOtp()}
                    loading={isVerifying}
                    className='h-[46px] px-8 bg-[#24d366] border-none hover:bg-[#1fb855] flex items-center gap-2'
                  >
                    <span className='text-sm font-medium tracking-[0.35px]'>
                      Saya sudah memindai kode
                    </span>
                    <ArrowRightOutlined />
                  </Button>
                )}
              </div>

              {/* Privacy Policy */}
              <Text
                type='secondary'
                className='block text-center text-sm leading-6'
              >
                Dengan mengeklik lanjut, Anda menyetujui{' '}
                <Link href='/auth/privacy'>kebijakan privasi</Link>{' '}
                dan{' '}
                <Link href='/auth/terms'>
                  syarat dan ketentuan
                </Link>
                kami.
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
