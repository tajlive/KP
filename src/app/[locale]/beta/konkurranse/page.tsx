



import { locales } from '@/i18n/config'
import CompetitionClient from './CompetitionClient'


export const dynamic = 'force-dynamic'

export default async function CompetitionPage({ params }: { params: Promise<{ locale: string }> }) {
    const resolvedParams = await params
    return <CompetitionClient params={resolvedParams} />
}
