import { BellOutlined, StarOutlined, TagsOutlined } from '@ant-design/icons'
import { OnboardingLayout } from '@app/components/onboarding/OnboardingLayout'
import { useOnboarding } from '@app/hooks/useOnboarding'
import apiClient from '@app/lib/api/client'
import { Form, Checkbox, Button, Card, Alert, Tag, Space, message } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function meta() {
  return [
    { title: 'Opsi lanjutan - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Konfigurasikan opsi lanjutan toko Anda',
    },
  ]
}

export default function OnboardingAdvancedOptions() {
  const navigate = useNavigate()
  const { currentStep, currentStepNumber } = useOnboarding(
    '/onboarding/advanced-options'
  )
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // TODO: Replace with actual API endpoint
      await apiClient.post('/settings/advanced', {
        autoReminder: values.autoReminder || false,
        requestReview: values.requestReview || false,
      })

      message.success('Konfigurasi selesai dengan berhasil!')

      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error)
      message.error(
        error.response?.data?.message ||
          'Kesalahan saat menyimpan opsi'
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    navigate('/onboarding/business-info')
  }

  return (
    <OnboardingLayout
      currentStep={currentStepNumber}
      title={currentStep?.title || ''}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleSubmit}
        initialValues={{
          autoReminder: false,
          requestReview: false,
        }}
      >
        <div className='space-y-6'>
          {/* Auto Reminder Option */}
          <Card className='hover:shadow-md transition-shadow'>
            <div className='flex items-start gap-4'>
              <div className='flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center'>
                <BellOutlined className='text-2xl text-blue-600' />
              </div>
              <div className='flex-1'>
                <Form.Item
                  name='autoReminder'
                  valuePropName='checked'
                  className='mb-0'
                >
                  <Checkbox>
                    <span className='text-lg font-semibold'>
                      Mengingatkan klien secara otomatis
                    </span>
                  </Checkbox>
                </Form.Item>
                <p className='text-gray-600 mt-2 ml-6'>
                  Jika seorang klien berjanji untuk memesan tetapi tidak
                  menyelesaikannya, kirimkan otomatis pengingat setelah 24 jam.
                </p>
                <div className='ml-6 mt-3'>
                  <Tag color='blue'>Direkomendasikan</Tag>
                  <Tag color='green'>Meningkatkan konversi</Tag>
                </div>
              </div>
            </div>
          </Card>

          {/* Request Review Option */}
          <Card className='hover:shadow-md transition-shadow'>
            <div className='flex items-start gap-4'>
              <div className='flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center'>
                <StarOutlined className='text-2xl text-yellow-600' />
              </div>
              <div className='flex-1'>
                <Form.Item
                  name='requestReview'
                  valuePropName='checked'
                  className='mb-0'
                >
                  <Checkbox>
                    <span className='text-lg font-semibold'>
                      Minta ulasan dari klien
                    </span>
                  </Checkbox>
                </Form.Item>
                <p className='text-gray-600 mt-2 ml-6'>
                  Setelah pesanan ditandai sebagai terkirim, minta
                  otomatis ulasan dari klien tentang pengalaman belanjanya.
                </p>
                <div className='ml-6 mt-3'>
                  <Tag color='gold'>Direkomendasikan</Tag>
                  <Tag color='purple'>Meningkatkan reputasi</Tag>
                </div>
              </div>
            </div>
          </Card>

          {/* Tags System Explanation */}
          <Card
            title={
              <Space>
                <TagsOutlined className='text-blue-600' />
                <span>Sistem tag</span>
              </Space>
            }
            className='bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
          >
            <p className='text-gray-700 mb-4'>
              Tag memungkinkan Anda mengatur dan memfilter klien,
              pesanan, dan produk.
            </p>

            <div className='space-y-3'>
              <div>
                <strong className='text-gray-900'>
                  Contoh penggunaan:
                </strong>
                <ul className='mt-2 ml-6 list-disc text-gray-600 space-y-1'>
                  <li>Tandai klien VIP untuk layanan prioritas</li>
                  <li>Identifikasi produk yang sedang promo</li>
                  <li>Kategorikan pesanan berdasarkan status khusus</li>
                  <li>Segmentasi klien berdasarkan wilayah atau preferensi</li>
                </ul>
              </div>

              <Alert
                message='Tips'
                description="Anda dapat membuat dan mengelola tag dari dashboard setelah onboarding."
                type='info'
                showIcon
                className='mt-4'
              />
            </div>
          </Card>

          {/* Info Alert */}
          <Alert
            message='Anda dapat mengubah opsi ini nanti'
            description='Pengaturan ini dapat disesuaikan kapan saja dari pengaturan akun Anda.'
            type='info'
            showIcon
          />

          {/* Action Buttons */}
          <div className='flex items-center justify-between pt-6 border-t'>
            <Button size='large' onClick={handlePrevious}>
              Sebelumnya
            </Button>

            <Button
              type='primary'
              size='large'
              htmlType='submit'
              loading={loading}
            >
              Selesai dan akses dashboard
            </Button>
          </div>
        </div>
      </Form>
    </OnboardingLayout>
  )
}
