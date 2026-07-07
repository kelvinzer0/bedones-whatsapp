import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import type { StatusSchedule } from '@app/lib/api/status-scheduler'
import { Button, DatePicker, Form, Input, Modal, Select, Upload } from 'antd'
import type { UploadProps } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect } from 'react'

import {
  CONTENT_TYPE_META,
  createSlotValue,
  getDisabledScheduleTime,
  getMinimumScheduleTime,
  type ComposerFormValues,
} from './utils'

type ComposerModalProps = {
  open: boolean
  onCancel: () => void
  selectedDay: string
  editingSchedule: StatusSchedule | null
  onSubmit: (values: ComposerFormValues) => void
  isPending: boolean
}

export function ComposerModal({
  open,
  onCancel,
  selectedDay,
  editingSchedule,
  onSubmit,
  isPending,
}: ComposerModalProps) {
  const [form] = Form.useForm<ComposerFormValues>()
  const contentType = Form.useWatch('contentType', form) || 'TEXT'
  const currentMediaUrl = Form.useWatch('mediaUrl', form)

  useEffect(() => {
    if (open) {
      if (editingSchedule) {
        form.setFieldsValue({
          caption: editingSchedule.caption || '',
          contentType: editingSchedule.contentType,
          mediaUrl: editingSchedule.mediaUrl || '',
          slots: [{ scheduledFor: dayjs(editingSchedule.scheduledFor) }],
          textContent: editingSchedule.textContent || '',
        })
      } else {
        form.setFieldsValue({
          caption: '',
          contentType: 'TEXT',
          mediaUrl: '',
          slots: [{ scheduledFor: createSlotValue(selectedDay) }],
          textContent: '',
        })
      }
    } else {
      form.resetFields()
    }
  }, [open, selectedDay, editingSchedule, form])

  useEffect(() => {
    if (contentType === 'TEXT') {
      form.setFieldValue('mediaUrl', '')
      form.setFieldValue('caption', '')
    }
  }, [contentType, form])

  const uploadProps: UploadProps = {
    accept: contentType === 'VIDEO' ? 'video/*' : 'image/*',
    beforeUpload: file => {
      const reader = new globalThis.FileReader()
      reader.onload = event => {
        const result = event.target?.result
        if (typeof result === 'string') {
          form.setFieldValue('mediaUrl', result)
        }
      }
      reader.readAsDataURL(file)
      return false
    },
    maxCount: 1,
    showUploadList: false,
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Batal
        </Button>,
        <Button
          key='submit'
          type='primary'
          icon={<PlusOutlined />}
          iconPosition='end'
          loading={isPending}
          onClick={() => form.submit()}
        >
          {editingSchedule ? 'Simpan' : 'Jadwalkan'}
        </Button>,
      ]}
      width={560}
      closeIcon={null}
      rootClassName='app-double-modal'
      title={
        <div className='space-y-2'>
          <h2 className='m-0 text-[var(--font-size-title-sm)] font-semibold text-[var(--color-text-primary)]'>
            {editingSchedule ? 'Ubah story' : 'Jadwalkan story'}
          </h2>
          <p className='m-0 text-sm leading-[1.7] font-normal text-[var(--color-text-secondary)]'>
            Ini akan dikirim seolah-olah dari ponsel cerdas Anda
          </p>
        </div>
      }
    >
      <div className='space-y-6 py-1'>
        <Form<ComposerFormValues>
          form={form}
          layout='vertical'
          onFinish={onSubmit}
          initialValues={{
            contentType: 'TEXT',
            slots: [{ scheduledFor: createSlotValue(selectedDay) }],
          }}
        >
          <Form.Item
            label='Tipe'
            name='contentType'
            rules={[{ required: true, message: 'Pilih tipe.' }]}
          >
            <Select
              options={Object.entries(CONTENT_TYPE_META).map(
                ([value, meta]) => ({
                  label: meta.label,
                  value,
                })
              )}
            />
          </Form.Item>

          <Form.List name='slots'>
            {(fields, { add, remove }) => (
              <div className='space-y-3'>
                <label className='block text-base text-[var(--color-text-secondary)]'>
                  Tanggal dan waktu
                </label>

                {fields.map(field => (
                  <div key={field.key} className='flex gap-2'>
                    <Form.Item
                      className='!mb-0 flex-1'
                      name={[field.name, 'scheduledFor']}
                      rules={[
                        {
                          required: true,
                          message: 'Pilih tanggal publikasi.',
                        },
                        {
                          validator: (_, value?: Dayjs | null) => {
                            if (!value) {
                              return Promise.resolve()
                            }

                            return value.isBefore(getMinimumScheduleTime())
                              ? Promise.reject(
                                  new Error(
                                    `Pilih tanggal setidaknya 2 menit setelah saat ini.`
                                  )
                                )
                              : Promise.resolve()
                          },
                        },
                      ]}
                    >
                      <DatePicker
                        className='w-full'
                        showTime={{ format: 'HH:mm' }}
                        format='DD MMM YYYY, HH:mm'
                        popupClassName='status-scheduler-slot-picker-dropdown'
                        disabledDate={current =>
                          current
                            ? current
                                .endOf('day')
                                .isBefore(
                                  getMinimumScheduleTime().startOf('day')
                                )
                            : false
                        }
                        disabledTime={getDisabledScheduleTime}
                      />
                    </Form.Item>

                    {fields.length > 1 ? (
                      <Button
                        onClick={() => remove(field.name)}
                        className={'h-13!'}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                ))}

                {!editingSchedule ? (
                  <Button
                    className='mb-5'
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({ scheduledFor: createSlotValue(selectedDay) })
                    }
                  >
                    Tambah tanggal lain
                  </Button>
                ) : null}
              </div>
            )}
          </Form.List>

          {contentType !== 'TEXT' ? (
            <>
              <Form.Item className='mt-6' label='Pesan' name='caption'>
                <Input.TextArea rows={5} placeholder='Sesuaikan dengan klien' />
              </Form.Item>

              <Form.Item
                label='Ilustrasi'
                name='mediaUrl'
                rules={[
                  {
                    required: true,
                    message: 'Tambahkan media untuk story ini.',
                  },
                ]}
              >
                <Upload {...uploadProps}>
                  <div className='rounded-[var(--radius-card)] border-none bg-[var(--color-surface-muted)] px-5 py-10 text-center shadow-card'>
                    {currentMediaUrl ? (
                      <div className='space-y-4'>
                        <div className='overflow-hidden rounded-[var(--radius-control)]'>
                          {contentType === 'VIDEO' ? (
                            <video
                              src={currentMediaUrl}
                              controls
                              className='block w-full max-h-[220px] rounded-[var(--radius-control)] object-cover'
                            />
                          ) : (
                            <img
                              src={currentMediaUrl}
                              alt='Pratinjau'
                              className='block w-full max-h-[220px] rounded-[var(--radius-control)] object-cover'
                            />
                          )}
                        </div>
                        <Button variant={'text'}>Ganti file</Button>
                      </div>
                    ) : (
                      <div className='space-y-3'>
                        <div className='mx-auto inline-flex h-14 w-14 items-center justify-center rounded-[18px] border border-[rgba(36,211,102,0.3)] text-2xl text-[var(--color-primary)]'>
                          <UploadOutlined />
                        </div>
                        <div>
                          <p className='m-0 text-lg font-semibold text-[var(--color-text-primary)]'>
                            Klik di sini untuk memuat gambar Anda
                          </p>
                          <p className='mb-0 mt-2 text-sm leading-[1.7] text-[var(--color-text-secondary)]'>
                            Anda dapat mengirim beberapa gambar dan kemudian
                            memilih urutan publikasi
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Upload>
              </Form.Item>
            </>
          ) : (
            <Form.Item
              className='mt-6'
              label='Pesan Anda'
              name='textContent'
              rules={[
                { required: true, message: 'Tambahkan teks story.' },
              ]}
            >
              <Input.TextArea rows={6} placeholder='Sesuaikan dengan klien' />
            </Form.Item>
          )}
        </Form>
      </div>
    </Modal>
  )
}
