



import { Metadata } from 'next'
import { VelkommenContent } from './VelkommenContent'

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Velkommen - Klarpakke Universitet',
  description: 'Din vei til å mestre kryptotrading'
}


export const dynamic = 'force-dynamic'

export default function VelkommenPage() {
  return <VelkommenContent />
}
