



import { Metadata } from 'next'
import { BetaTestingContent } from './BetaTestingContent'

export const metadata: Metadata = {
  title: 'Beta Testing Guide - Klarpakke Universitet',
  description: 'Alt du trenger å vite om beta-perioden'
}


export const dynamic = 'force-dynamic'

export default async function BetaTestingPage({ params }: { params: Promise<{ locale: string }> }) {
  await params
  return <BetaTestingContent />
}
