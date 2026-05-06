import { getTranslations } from 'next-intl/server';

export default async function ClientPersonvern() {
  const t = await getTranslations('legal.privacy');

  return (
    <div className="min-h-screen bg-white text-gray-900 py-16 pt-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('intro.title')}</h2>
          <p className="text-gray-600">
            {t('intro.content')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('collection.title')}</h2>
          <p className="text-gray-600">
            {t('collection.content')}
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            {(t.raw('collection.list') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('usage.title')}</h2>
          <p className="text-gray-600">
            {t('usage.content')}
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-600">
            {(t.raw('usage.list') as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('cookies.title')}</h2>
          <p className="text-gray-600">
            {t('cookies.content')}
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">{t('rights.title')}</h2>
          <p className="text-gray-600">
            {t('rights.content')}
          </p>
        </section>
      </div>
    </div>
  );
}
