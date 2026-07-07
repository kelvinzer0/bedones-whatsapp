import { OnboardingLayout } from '@app/components/onboarding/OnboardingLayout'
import {
  ProductCard,
  type AISuggestion,
} from '@app/components/onboarding/ProductCard'
import { useOnboarding } from '@app/hooks/useOnboarding'
import apiClient from '@app/lib/api/client'
import { Button, Space, Empty, Spin, message } from 'antd'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Product {
  id: string
  name: string
  description: string
  price: number
  currency?: string
  image?: string
  approved?: boolean
}

export function meta() {
  return [
    { title: 'Verifikasi produk - WhatsApp Agent' },
    {
      name: 'description',
      content: "Verifikasi dan analisis produk Anda dengan AI",
    },
  ]
}

export default function OnboardingReviewProducts() {
  const navigate = useNavigate()
  const { currentStep, currentStepNumber } = useOnboarding(
    '/onboarding/review-products'
  )
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzingAll, setAnalyzingAll] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      // TODO: Replace with actual API endpoint
      const response = await apiClient.get('/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
      message.error('Tidak dapat memuat produk')
      // Mock data for development
      setProducts([
        {
          id: '1',
          name: 'T-shirt Premium',
          description: 'T-shirt katun berkualitas tinggi',
          price: 1500000,
          currency: 'XAF',
          image: undefined,
          approved: false,
        },
        {
          id: '2',
          name: 'Jeans Slim',
          description: 'Jeans slim fit yang nyaman',
          price: 2500000,
          currency: 'XAF',
          image: undefined,
          approved: false,
        },
        {
          id: '3',
          name: 'Sneakers Olahraga',
          description: 'Sepatu olahraga yang bernapas',
          price: 3500000,
          currency: 'XAF',
          image: undefined,
          approved: false,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (productId: string, approved: boolean) => {
    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, approved } : p))
    )
  }

  const handleAnalyze = async (productId: string): Promise<AISuggestion[]> => {
    try {
      // TODO: Replace with actual whatsapp-agent API endpoint
      const response = await apiClient.post(`/ai/analyze-product/${productId}`)
      return response.data.suggestions
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error)
      // Mock suggestions for development
      return [
        {
          type: 'spelling',
          field: 'Nama produk',
          current: 'T-shirt Premium',
          suggested: 'T-shirt Premium',
          reason: 'Ejaan sudah benar',
        },
        {
          type: 'improvement',
          field: 'Deskripsi',
          current: 'T-shirt katun berkualitas tinggi',
          suggested:
            'T-shirt katun 100% organik berkualitas tinggi, potongan modern dan nyaman',
          reason: 'Deskripsi yang lebih rinci dan menarik untuk klien',
        },
        {
          type: 'metadata',
          field: 'Kategori',
          current: 'Belum ditentukan',
          suggested: 'Pakaian > Atasan > T-shirt',
          reason: 'Kategorisasi untuk pengaturan yang lebih baik',
        },
      ]
    }
  }

  const handleAnalyzeAll = async () => {
    setAnalyzingAll(true)
    try {
      // Analyze all products sequentially
      for (const product of products) {
        await handleAnalyze(product.id)
      }
      message.success('Semua produk telah dianalisis')
    } catch (error) {
      message.error("Kesalahan saat menganalisis produk")
    } finally {
      setAnalyzingAll(false)
    }
  }

  const handleContinue = () => {
    navigate('/onboarding/business-info')
  }

  const handlePrevious = () => {
    navigate('/onboarding/import')
  }

  const allApproved = products.length > 0 && products.every(p => p.approved)

  if (loading) {
    return (
      <OnboardingLayout
        currentStep={currentStepNumber}
        title={currentStep?.title || ''}
      >
        <div className='flex justify-center items-center py-20'>
          <Spin size='large' />
        </div>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout
      currentStep={currentStepNumber}
      title={currentStep?.title || ''}
    >
      <div className='space-y-6'>
        {products.length === 0 ? (
          <Empty description='Tidak ada produk ditemukan' className='py-12'>
            <Button type='primary' onClick={handleContinue}>
              Lanjut tanpa produk
            </Button>
          </Empty>
        ) : (
          <>
            {/* Products List */}
            <div className='space-y-4'>
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onApprove={handleApprove}
                  onAnalyze={handleAnalyze}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className='flex items-center justify-between pt-6 border-t'>
              <Button size='large' onClick={handlePrevious}>
                Sebelumnya
              </Button>

              <Space>
                <Button
                  size='large'
                  loading={analyzingAll}
                  onClick={handleAnalyzeAll}
                >
                  Analisis semua
                </Button>

                <Button
                  type='primary'
                  size='large'
                  onClick={handleContinue}
                  disabled={!allApproved && products.length > 0}
                >
                  Lanjut
                  {!allApproved && products.length > 0 && (
                    <span className='ml-2 text-xs'>
                      ({products.filter(p => p.approved).length}/
                      {products.length} disetujui)
                    </span>
                  )}
                </Button>
              </Space>
            </div>

            {!allApproved && products.length > 0 && (
              <p className='text-sm text-gray-500 text-center'>
                Silakan setujui semua produk untuk melanjutkan
              </p>
            )}
          </>
        )}
      </div>
    </OnboardingLayout>
  )
}
