



import { Metadata } from 'next'
import { BinanceGuideContent } from './BinanceGuideContent'

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Slik kommer du i gang med Binance - Klarpakke Universitet',
  description: 'Komplett guide for å opprette Binance-konto via Klarpakke'
}


export const dynamic = 'force-dynamic'

export default function BinanceGuidePage() {
  return <BinanceGuideContent />
}
