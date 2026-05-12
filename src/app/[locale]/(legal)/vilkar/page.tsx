



import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

export const runtime = 'edge';

export const revalidate = 86400; // 24 hours

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legal.terms' })
  return {
    title: t('title'),
    description: 'Terms and conditions for Klarpakke University',
  }
}

export default function TermsPage() {
  const t = useTranslations('legal.terms')

  return (
    <div className="min-h-screen bg-white text-gray-900 py-16 pt-20 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <div className="prose prose-blue max-w-none">
          <p className="text-gray-500 mb-6">
            {t('lastUpdated')}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.1.title')}</h2>
            <p className="text-gray-600">
              {t('sections.1.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.2.title')}</h2>
            <p className="text-gray-600">
              {t('sections.2.content')}
              <strong className="text-gray-900 ml-1">{t('sections.2.bold')}</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.3.title')}</h2>
            <p className="text-gray-600 mb-4">
              {t('sections.3.content')}
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              {(t.raw('sections.3.list') as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.4.title')}</h2>
            <p className="text-gray-600">
              {t('sections.4.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.5.title')}</h2>
            <p className="text-gray-600">
              {t('sections.5.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.6.title')}</h2>
            <p className="text-gray-600">
              {t('sections.6.content')}
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{t('sections.7.title')}</h2>
            <p className="text-gray-600">
              {t('sections.7.content')}{" "}
              <a href="mailto:support@klarpakke.no" className="text-blue-600 hover:text-blue-500">
                support@klarpakke.no
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
