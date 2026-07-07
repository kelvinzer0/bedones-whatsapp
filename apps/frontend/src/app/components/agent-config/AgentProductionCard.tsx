import {
  ArrowRightOutlined,
  InfoCircleOutlined,
  TagOutlined,
} from '@ant-design/icons'
import RocketIcon from '@app/assets/Rocket.svg?react'
import { useAuth } from '@app/hooks/useAuth'
import apiClient from '@app/lib/api/client'
import { App, Button, Card, Typography, Modal, Input, Alert } from 'antd'
import Form from 'antd/es/form'
import FormItem from 'antd/es/form/FormItem'
import { useState, useEffect } from 'react'

const { Text, Link } = Typography

interface FormValues {
  labelName: string
}

export function AgentProductionCard() {
  const { user, checkAuth } = useAuth()
  const { notification } = App.useApp()
  const agentConfig = user?.agentConfig

  const [form] = Form.useForm<FormValues>()
  const labelNameValue = Form.useWatch('labelName', form)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (agentConfig?.labelsToNotReply?.[0]) {
      form.setFieldValue('labelName', agentConfig.labelsToNotReply[0])
    }
  }, [agentConfig?.labelsToNotReply, form])

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleSave = async (values: FormValues) => {
    const labelName = values.labelName.trim()

    setLoading(true)
    try {
      await apiClient.patch('/whatsapp-agents/config', {
        labelsToNotReply: [labelName],
        productionEnabled: true,
      })
      notification.success({
        message: 'IA diaktifkan di produksi',
      })
      handleCloseModal()
      checkAuth()
    } catch (error) {
      console.error('Failed to save config:', error)
      notification.error({
        message: 'Kesalahan saat menyimpan',
        description:
          error instanceof Error ? error.message : 'Konfigurasi gagal.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className='h-full'>
        <div className='flex flex-col gap-4 w-full'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
            <div className='w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center'>
              <RocketIcon className='w-5 h-5' />
            </div>
            <Button
              type='primary'
              shape='round'
              icon={<ArrowRightOutlined />}
              iconPosition='end'
              onClick={handleOpenModal}
            >
              {agentConfig?.productionEnabled ? 'Konfigurasi' : 'Aktifkan IA'}
            </Button>
          </div>
          <div>
            <Text strong className='block mb-1'>
              Aktifkan IA untuk semua kontak Anda
            </Text>
            <Text type='secondary'>
              {agentConfig?.productionEnabled ? (
                <>
                  IA diaktifkan.{' '}
                  {(agentConfig?.labelsToNotReply?.length ?? 0) > 0 &&
                    `Label "${agentConfig?.labelsToNotReply?.[0]}" dikonfigurasi.`}{' '}
                  <Link underline onClick={handleOpenModal}>
                    Ubah
                  </Link>
                </>
              ) : (
                <>
                  IA akan membalas semua kontak kecuali kontak yang
                  dikecualikan. <Link onClick={handleOpenModal}>Konfigurasi</Link>
                </>
              )}
            </Text>
          </div>
        </div>
      </Card>

      <Modal
        title='Konfigurasi mode produksi'
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={[
          <Button key='cancel' onClick={handleCloseModal}>
            Batal
          </Button>,
          <Button
            key='save'
            type='primary'
            loading={loading}
            onClick={() => form.submit()}
          >
            Simpan
          </Button>,
        ]}
        width={600}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSave}
          initialValues={{
            labelName: 'Nonaktifkan IA',
          }}
        >
          <div className='flex flex-col gap-6 py-4'>
            <div>
              <FormItem
                name='labelName'
                label='Label pengecualian'
                rules={[
                  {
                    required: true,
                    message: 'Silakan masukkan nama label',
                  },
                ]}
              >
                <Input placeholder='Nama label' prefix={<TagOutlined />} />
              </FormItem>

              {labelNameValue?.trim() && (
                <Alert
                  message='Bagaimana cara kerjanya?'
                  description={
                    <>
                      Kami akan membuat label{' '}
                      <strong>&quot;{labelNameValue.trim()}&quot;</strong> di
                      WhatsApp Anda. Untuk mengkecualikan kontak dari balasan
                      otomatis, cukup tambahkan label ini ke
                      percakapannya.
                    </>
                  }
                  type='info'
                  showIcon
                  icon={<InfoCircleOutlined />}
                />
              )}
            </div>
          </div>
        </Form>
      </Modal>
    </>
  )
}
