import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { OnboardingLayout } from '@app/components/onboarding/OnboardingLayout'
import { useOnboarding } from '@app/hooks/useOnboarding'
import apiClient from '@app/lib/api/client'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Checkbox,
  InputNumber,
  Divider,
  message,
} from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface DeliveryLocation {
  country: string
  city: string
  zoneName: string
  price: number
}

const countries = [
  { label: 'Kamerun', value: 'CM' },
  { label: 'Pantai Gading', value: 'CI' },
  { label: 'Senegal', value: 'SN' },
  { label: 'Mali', value: 'ML' },
  { label: 'Burkina Faso', value: 'BF' },
  { label: 'Benin', value: 'BJ' },
  { label: 'Togo', value: 'TG' },
]

export function meta() {
  return [
    { title: 'Informasi toko - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Konfigurasikan informasi toko Anda',
    },
  ]
}

export default function OnboardingBusinessInfo() {
  const navigate = useNavigate()
  const { currentStep, currentStepNumber } = useOnboarding(
    '/onboarding/business-info'
  )
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [deliveryLocations, setDeliveryLocations] = useState<
    DeliveryLocation[]
  >([{ country: '', city: '', zoneName: '', price: 0 }])

  const handleAddLocation = () => {
    setDeliveryLocations([
      ...deliveryLocations,
      { country: '', city: '', zoneName: '', price: 0 },
    ])
  }

  const handleRemoveLocation = (index: number) => {
    if (deliveryLocations.length > 1) {
      setDeliveryLocations(deliveryLocations.filter((_, i) => i !== index))
    }
  }

  const handleLocationChange = (
    index: number,
    field: keyof DeliveryLocation,
    value: any
  ) => {
    const updated = [...deliveryLocations]
    updated[index] = { ...updated[index], [field]: value }
    setDeliveryLocations(updated)
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      // Prepare business settings data
      const businessData = {
        country: values.country,
        city: values.city,
        address: values.address,
        deliveryLocations: deliveryLocations.filter(
          loc => loc.country && loc.city && loc.zoneName
        ),
        paymentMethods: {
          cash: values.cash || false,
          mobileMoney: {
            enabled: values.mobileMoneyEnabled || false,
            number: values.mobileMoneyNumber || '',
            name: values.mobileMoneyName || '',
            requireProof: values.mobileMoneyRequireProof || false,
          },
        },
      }

      // TODO: Replace with actual API endpoint
      await apiClient.post('/settings/business', businessData)

      message.success('Informasi berhasil disimpan')
      navigate('/onboarding/advanced-options')
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error)
      message.error(
        error.response?.data?.message ||
          'Kesalahan saat menyimpan informasi'
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    navigate('/onboarding/review-products')
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
          cash: true,
          mobileMoneyEnabled: false,
          mobileMoneyRequireProof: true,
        }}
      >
        {/* Business Location */}
        <Card title='Lokasi toko' className='mb-6'>
          <Form.Item
            label='Negara'
            name='country'
            rules={[
              { required: true, message: 'Silakan pilih negara' },
            ]}
          >
            <Select
              size='large'
              placeholder='Pilih negara Anda'
              options={countries}
            />
          </Form.Item>

          <Form.Item
            label='Kota'
            name='city'
            rules={[{ required: true, message: 'Silakan masukkan kota Anda' }]}
          >
            <Input size='large' placeholder='Cth: Douala' />
          </Form.Item>

          <Form.Item
            label='Alamat'
            name='address'
            rules={[
              { required: true, message: 'Silakan masukkan alamat Anda' },
            ]}
          >
            <Input.TextArea
              size='large'
              rows={3}
              placeholder='Cth: Quartier Akwa, Rue de la Joie'
            />
          </Form.Item>
        </Card>

        {/* Delivery Locations */}
        <Card
          title='Lokasi pengiriman'
          className='mb-6'
          extra={
            <Button
              type='dashed'
              icon={<PlusOutlined />}
              onClick={handleAddLocation}
            >
              Tambah lokasi
            </Button>
          }
        >
          <div className='space-y-4'>
            {deliveryLocations.map((location, index) => (
              <Card
                key={index}
                size='small'
                className='bg-gray-50'
                extra={
                  deliveryLocations.length > 1 && (
                    <Button
                      type='text'
                      danger
                      size='small'
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveLocation(index)}
                    >
                      Hapus
                    </Button>
                  )
                }
              >
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Negara
                    </label>
                    <Select
                      value={location.country}
                      onChange={value =>
                        handleLocationChange(index, 'country', value)
                      }
                      placeholder='Pilih'
                      options={countries}
                      className='w-full'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Kota
                    </label>
                    <Input
                      value={location.city}
                      onChange={e =>
                        handleLocationChange(index, 'city', e.target.value)
                      }
                      placeholder='Cth: Yaoundé'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Nama zona
                    </label>
                    <Input
                      value={location.zoneName}
                      onChange={e =>
                        handleLocationChange(index, 'zoneName', e.target.value)
                      }
                      placeholder='Cth: Pusat kota'
                    />
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>
                      Harga (FCFA)
                    </label>
                    <InputNumber
                      value={location.price}
                      onChange={value =>
                        handleLocationChange(index, 'price', value || 0)
                      }
                      placeholder='0'
                      min={0}
                      className='w-full'
                      formatter={value =>
                        `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                      }
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Payment Methods */}
        <Card title='Metode pembayaran' className='mb-6'>
          <Form.Item name='cash' valuePropName='checked'>
            <Checkbox>
              <span className='font-medium'>Tunai (Cash)</span>
            </Checkbox>
          </Form.Item>

          <Divider />

          <Form.Item name='mobileMoneyEnabled' valuePropName='checked'>
            <Checkbox>
              <span className='font-medium'>Mobile Money</span>
            </Checkbox>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.mobileMoneyEnabled !== curr.mobileMoneyEnabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('mobileMoneyEnabled') && (
                <div className='ml-6 space-y-4 mt-4 p-4 bg-gray-50 rounded-lg'>
                  <Form.Item
                    label='Nomor Mobile Money'
                    name='mobileMoneyNumber'
                    rules={[
                      {
                        required: getFieldValue('mobileMoneyEnabled'),
                        message: 'Silakan masukkan nomor Anda',
                      },
                    ]}
                  >
                    <Input size='large' placeholder='Cth: +237 6XX XXX XXX' />
                  </Form.Item>

                  <Form.Item
                    label='Nama akun'
                    name='mobileMoneyName'
                    rules={[
                      {
                        required: getFieldValue('mobileMoneyEnabled'),
                        message: 'Silakan masukkan nama akun',
                      },
                    ]}
                  >
                    <Input size='large' placeholder='Cth: Jean Dupont' />
                  </Form.Item>

                  <Form.Item
                    name='mobileMoneyRequireProof'
                    valuePropName='checked'
                  >
                    <Checkbox>
                      Minta bukti pembayaran dari klien
                    </Checkbox>
                  </Form.Item>
                </div>
              )
            }
          </Form.Item>
        </Card>

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
            Lanjut
          </Button>
        </div>
      </Form>
    </OnboardingLayout>
  )
}
