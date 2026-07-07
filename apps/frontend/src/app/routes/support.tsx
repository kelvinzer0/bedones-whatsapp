import {
  CustomerServiceOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { DashboardHeader } from '@app/components/layout'
import { SupportFeedbackModal } from '@app/components/support'
import { ActionCard } from '@app/components/ui'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

type SupportLocationState = {
  category?: string
  subject?: string
}

export function meta() {
  return [
    { title: 'Dukungan - WhatsApp Agent' },
    {
      name: 'description',
      content:
        'Titik masuk dukungan dengan FAQ, asisten AI, dan formulir Sentry',
    },
  ]
}

export default function SupportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state || {}) as SupportLocationState
  const [contactModalOpen, setContactModalOpen] = useState(false)

  return (
    <>
      <DashboardHeader title='Dukungan dan Bantuan' />

      <div className='w-full space-y-4 px-4 py-5 sm:px-6 sm:py-6'>
        <div className='merge-border-radius grid gap-2'>
          <ActionCard
            title='Baca pertanyaan dan jawaban kami'
            subtitle='Lihat pertanyaan yang paling sering ditanyakan klien beserta jawabannya'
            actionLabel='Baca FAQ'
            icon={<QuestionCircleOutlined />}
            onAction={() => navigate('/faq')}
          />

          <ActionCard
            title='Bicara dengan salah satu agent AI kami'
            subtitle='Dapatkan jawaban instan dari agent yang menguasai sepenuhnya perusahaan Anda'
            actionLabel='Ajukan pertanyaan'
            icon={<MessageOutlined />}
            onAction={() => navigate('/context')}
          />

          <ActionCard
            title='Bicara dengan anggota tim dukungan'
            subtitle='Kirimkan kami pesan untuk menerima jawaban dalam 24 jam maksimal'
            actionLabel='Kirim pesan'
            icon={<CustomerServiceOutlined />}
            onAction={() => setContactModalOpen(true)}
          />
        </div>
      </div>

      <SupportFeedbackModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        initialCategory={state.category}
        subject={state.subject}
      />
    </>
  )
}
