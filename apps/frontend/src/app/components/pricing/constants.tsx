import AIImageSearchIcon from '@app/assets/pricing/ai-image-search.svg?react'
import AsyncIcon from '@app/assets/pricing/async.svg?react'
import AudioWaveIcon from '@app/assets/pricing/audio-wave.svg?react'
import AudioIllustration from '@app/assets/pricing/AudioIllustration.svg?react'
import BarChartIcon from '@app/assets/pricing/bar-chart.svg?react'
import BarcodeSearchIcon from '@app/assets/pricing/barcode-search.svg?react'
import CatalogLearnIcon from '@app/assets/pricing/catalog-learn.svg?react'
import ContactAddIcon from '@app/assets/pricing/contact-add.svg?react'
import ImageIllustration from '@app/assets/pricing/ImageIllustration.svg?react'
import SimilarityIcon from '@app/assets/pricing/similarity.svg?react'
import StoryScheduleIcon from '@app/assets/pricing/story-schedule.svg?react'
import TextContextIcon from '@app/assets/pricing/text-context.svg?react'
import TextIllustration from '@app/assets/pricing/TextIllustration.svg?react'
import type { PlanKey } from '@app/lib/current-plan'
import type { ReactNode } from 'react'

export type BillingDuration = 1 | 6 | 12

export type PlanFeature = {
  description: string
  icon: ReactNode
  label: string
}

export type PlanFeatureGroup = {
  items: PlanFeature[]
  title: string
}

export type PlanConfig = {
  accentLabel?: string
  creditAmount: string
  creditSuffix: string
  ctaLabel?: string
  features: PlanFeatureGroup[]
  includedLabel?: string
  monthlyCredits?: number
  monthlyPrice: number
  overagePrice?: string
  overageSuffix?: string
}

export type CreditFact = {
  description: string
  illustration: ReactNode
  title: string
}

export const PLAN_ORDER: PlanKey[] = ['free', 'pro', 'business']

export const BILLING_OPTIONS: Array<{ label: string; value: BillingDuration }> =
  [
    { label: 'Satu bulan', value: 1 },
    { label: '6 bulan', value: 6 },
    { label: 'Satu tahun', value: 12 },
  ]

export const DURATION_DISCOUNT: Record<BillingDuration, number> = {
  1: 0,
  6: 0.2,
  12: 0.25,
}

export const PAYMENT_METHODS = [
  { alt: 'Visa', src: '/payments/visa.jpeg' },
  { alt: 'Mastercard', src: '/payments/mastercard.jpg' },
  { alt: 'Orange Money', src: '/payments/orange-money.jpeg' },
  { alt: 'MTN Mobile Money', src: '/payments/mtn-momo.jpeg' },
]

export const PLAN_CONTENT: Record<PlanKey, PlanConfig> = {
  free: {
    creditAmount: '200',
    creditSuffix: 'kredit gratis',
    features: [
      {
        items: [
          {
            description:
              'Bicaralah dengan agent untuk memberitahukan cara membalas pelanggan Anda.',
            icon: <TextContextIcon className='h-6 w-6' />,
            label: 'Konteks yang dipersonalisasi',
          },
          {
            description:
              'Agent menganalisis dan mengingat gambar serta deskripsi produk Anda.',
            icon: <CatalogLearnIcon className='h-6 w-6' />,
            label: 'Pembelajaran katalog',
          },
        ],
        title: 'Pemahaman bisnis Anda',
      },
      {
        items: [
          {
            description:
              'Agent memahami catatan suara seolah-olah itu adalah teks.',
            icon: <AudioWaveIcon className='h-6 w-6' />,
            label: 'Pemahaman audio',
          },
        ],
        title: 'Audio',
      },
      {
        items: [
          {
            description:
              'Saat gambar memuat kode produk, produk tersebut akan dikenali.',
            icon: <BarcodeSearchIcon className='h-6 w-6' />,
            label: 'Pencarian berdasarkan retailer ID',
          },
          {
            description:
              'Saat gambar mirip dengan salah satu gambar produk Anda, produk tersebut akan dikenali.',
            icon: <SimilarityIcon className='h-6 w-6' />,
            label: 'Pencarian berdasarkan kemiripan',
          },
        ],
        title: 'Gambar',
      },
    ],
    monthlyPrice: 0,
  },
  pro: {
    accentLabel: 'Populer',
    creditAmount: '1 000',
    creditSuffix: 'kredit per bulan,',
    ctaLabel: 'Naik ke versi Pro',
    features: [
      {
        items: [
          {
            description:
              'Gambar dianalisis dalam konteks bisnis Anda untuk mengetahui apakah isinya sangat sesuai dengan salah satu produk Anda.',
            icon: <AIImageSearchIcon className='h-6 w-6' />,
            label: 'Pencarian berdasarkan pemahaman',
          },
        ],
        title: 'Gambar',
      },
      {
        items: [
          {
            description:
              'Jadwalkan pengiriman stories Anda di awal untuk periode apa pun.',
            icon: <StoryScheduleIcon className='h-6 w-6' />,
            label: 'Penjadwalan stories',
          },
        ],
        title: 'Stories',
      },
      {
        items: [
          {
            description:
              'Agent dapat bertindak bahkan saat tidak ada pesan yang diterima, misalnya untuk mengirim pengingat ke pelanggan.',
            icon: <AsyncIcon className='h-6 w-6' />,
            label: 'Tugas asinkron',
          },
        ],
        title: 'Tugas asinkron',
      },
    ],
    includedLabel: 'Semua di Free, plus',
    monthlyCredits: 1000,
    monthlyPrice: 10,
    overagePrice: '$0.01',
    overageSuffix: 'per kredit tambahan',
  },
  business: {
    creditAmount: '3 000',
    creditSuffix: 'kredit per bulan,',
    ctaLabel: 'Naik ke versi Business',
    features: [
      {
        items: [
          {
            description:
              'Perbandingan antar tampilan stories Anda untuk mengetahui apa yang paling berhasil.',
            icon: <BarChartIcon className='h-6 w-6' />,
            label: 'Statistik status',
          },
        ],
        title: 'Stories',
      },
      {
        items: [
          {
            description:
              'Pembuatan kontak otomatis untuk percakapan baru agar mereka dapat melihat status Anda.',
            icon: <ContactAddIcon className='h-6 w-6' />,
            label: 'Penyimpanan kontak otomatis',
          },
        ],
        title: 'Kontak',
      },
    ],
    includedLabel: 'Semua di Pro, plus',
    monthlyCredits: 3000,
    monthlyPrice: 25,
    overagePrice: '$0.008',
    overageSuffix: 'per kredit tambahan',
  },
}

export const CREDIT_FACTS: CreditFact[] = [
  {
    description:
      'Setiap pesan teks yang diterima atau dikirim oleh agent menggunakan satu kredit.',
    illustration: (
      <TextIllustration className='h-[132px] w-[132px] text-[var(--color-text-secondary)]' />
    ),
    title: 'Satu kredit per teks',
  },
  {
    description:
      'Setiap analisis gambar menggunakan dua kredit, terlepas dari mode pencarian yang digunakan.',
    illustration: (
      <ImageIllustration className='h-[130px] w-[130px] text-[var(--color-text-secondary)]' />
    ),
    title: 'Dua kredit per gambar',
  },
  {
    description:
      'Transkripsi dan analisis pesan suara menggunakan satu setengah kredit.',
    illustration: <AudioIllustration className='h-[128px] w-[128px]' />,
    title: '1,5 kredit per audio',
  },
]

export function formatDisplayPrice(amount: number, maximumFractionDigits = 2) {
  return `$${amount.toLocaleString('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  })}`
}

export function formatCreditsAmount(amount: number) {
  return amount.toLocaleString('id-ID')
}

export function getPlanCreditsSummary(
  config: PlanConfig,
  duration: BillingDuration
) {
  if (!config.monthlyCredits) {
    return {
      amount: config.creditAmount,
      suffix: config.creditSuffix,
    }
  }

  const totalCredits = config.monthlyCredits * duration

  return {
    amount: formatCreditsAmount(totalCredits),
    suffix:
      duration === 1
        ? 'kredit termasuk,'
        : `kredit termasuk untuk ${duration} bulan,`,
  }
}

export function getPlanLabel(plan: PlanKey) {
  if (plan === 'free') {
    return 'Free'
  }

  if (plan === 'pro') {
    return 'Pro'
  }

  return 'Business'
}

export function getDurationCtaLabel(duration: BillingDuration) {
  return duration === 1 ? 'satu' : `${duration}`
}

export function getTotalPrice(monthlyPrice: number, duration: BillingDuration) {
  const discountMultiplier = 1 - DURATION_DISCOUNT[duration]
  return Math.round(monthlyPrice * duration * discountMultiplier * 100) / 100
}

export function getDisplayedMonthlyPrice(
  monthlyPrice: number,
  duration: BillingDuration
) {
  return (
    Math.round((getTotalPrice(monthlyPrice, duration) / duration) * 10) / 10
  )
}
