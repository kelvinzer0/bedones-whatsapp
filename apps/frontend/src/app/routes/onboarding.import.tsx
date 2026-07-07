import { OnboardingLayout } from '@app/components/onboarding/OnboardingLayout'
import { useOnboarding } from '@app/hooks/useOnboarding'
import apiClient from '@app/lib/api/client'
import { Progress, Spin, Alert, Button } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const importSteps = [
  'Menghubungkan ke WhatsApp...',
  'Mengambil profil bisnis...',
  'Mengimpor katalog produk...',
  'Mengimpor kontak...',
]

export function meta() {
  return [
    { title: 'Impor data - WhatsApp Agent' },
    {
      name: 'description',
      content: 'Mengimpor data WhatsApp Business Anda',
    },
  ]
}

export default function OnboardingImport() {
  const navigate = useNavigate()
  const { currentStep, currentStepNumber } = useOnboarding('/onboarding/import')
  const [currentImportStep, setCurrentImportStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const startImport = async () => {
    setIsImporting(true)
    setError(null)
    setCurrentImportStep(0)

    try {
      // Simulate progress through steps
      for (let i = 0; i < importSteps.length; i++) {
        setCurrentImportStep(i)
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      // Make the actual API call
      await apiClient.post('/users/me/import-whatsapp')

      // Navigate to next step on success
      navigate('/onboarding/review-products')
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Terjadi kesalahan saat mengimpor. Silakan coba lagi."
      )
      setIsImporting(false)
    }
  }

  useEffect(() => {
    // Auto-start import on mount
    startImport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progressPercent = ((currentImportStep + 1) / importSteps.length) * 100

  return (
    <OnboardingLayout
      currentStep={currentStepNumber}
      title={currentStep?.title || ''}
    >
      <div className='max-w-2xl mx-auto'>
        {error ? (
          <div className='space-y-6'>
            <Alert
              message="Kesalahan impor"
              description={error}
              type='error'
              showIcon
            />
            <div className='flex justify-center'>
              <Button type='primary' size='large' onClick={startImport}>
                Coba lagi
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-8'>
            {/* Progress Bar */}
            <Progress
              percent={Math.round(progressPercent)}
              status={isImporting ? 'active' : 'success'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />

            {/* Current Step */}
            <div className='flex flex-col items-center justify-center py-12'>
              <Spin size='large' />
              <p className='mt-6 text-lg text-gray-700 font-medium'>
                {importSteps[currentImportStep]}
              </p>
            </div>

            {/* Steps List */}
            <div className='bg-gray-50 rounded-lg p-6'>
              <h3 className='text-sm font-semibold text-gray-900 mb-4'>
                Langkah impor:
              </h3>
              <ul className='space-y-2'>
                {importSteps.map((step, index) => (
                  <li
                    key={index}
                    className={`flex items-center gap-3 text-sm ${
                      index < currentImportStep
                        ? 'text-green-600'
                        : index === currentImportStep
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-400'
                    }`}
                  >
                    {index < currentImportStep ? (
                      <span className='w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs'>
                        ✓
                      </span>
                    ) : index === currentImportStep ? (
                      <span className='w-5 h-5 rounded-full border-2 border-blue-500 animate-pulse' />
                    ) : (
                      <span className='w-5 h-5 rounded-full border-2 border-gray-300' />
                    )}
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <Alert
              message='Jangan tutup halaman ini'
              description="Impor data Anda sedang berlangsung. Ini mungkin membutuhkan beberapa saat."
              type='info'
              showIcon
            />
          </div>
        )}
      </div>
    </OnboardingLayout>
  )
}
