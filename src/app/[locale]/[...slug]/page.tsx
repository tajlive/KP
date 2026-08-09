import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PortableText } from '@/components/portable-text/PortableText';
import { safeFetch } from '@/lib/sanity/client';
import { pageBySlugQuery } from '@/lib/sanity/queries';

export const runtime = 'nodejs';

interface PageDocument {
  _id: string;
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  content?: unknown[];
  publishedAt?: string;
}

interface DynamicPageProps {
  params: Promise<{ locale: string; slug: string[] }>;
}

export const dynamic = "force-dynamic"; // Was: revalidate = 3600 (ISR not supported on Cloudflare)

export async function generateMetadata({ params }: DynamicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = await safeFetch<PageDocument | null>(
    pageBySlugQuery,
    { slug: slug.join('/'), language: locale },
    null,
    { next: { revalidate: 3600, tags: ['sanity', 'sanity:page'] } }
  );

  if (!page) {
    notFound();
  }

  return {
    title: page.metaTitle ?? page.title,
    description: page.metaDescription,
  };
}

export default async function DynamicPage({ params }: DynamicPageProps) {
  const { locale, slug } = await params;
  const fullSlug = slug.join('/');

  const page = await safeFetch<PageDocument | null>(
    pageBySlugQuery,
    { slug: fullSlug, language: locale },
    null,
    { next: { revalidate: 3600, tags: ['sanity', 'sanity:page'] } }
  );

  if (!page) {
    // Soft-404-fiks: redirect til eksplisitt 404-route i stedet for notFound()
    // som mister status i OpenNext/Cloudflare-adapteren.
    redirect(`/${locale}/404`);
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-4">
            {page.title}
          </h1>
          {page.publishedAt && (
            <time className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(page.publishedAt).toLocaleDateString(locale === 'en' ? 'en-GB' : 'nb-NO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          )}
        </header>

        {page.content && (
          <div className="prose dark:prose-invert max-w-none">
            <PortableText value={page.content} />
          </div>
        )}
      </article>
    </main>
  );
}
