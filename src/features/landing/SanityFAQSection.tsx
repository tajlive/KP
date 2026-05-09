import { safeFetch } from '@/lib/sanity/client';
import { allFaqsQuery } from '@/lib/sanity/queries';
import { getTranslations } from 'next-intl/server';

interface SanityFAQ {
  _id: string;
  question: string;
  answer: string | unknown[];
}

interface FAQ {
  question: string;
  answer: string;
}

interface SanityFAQSectionProps {
  locale?: string;
}

async function getFallbackFAQs(t: (key: string) => string): Promise<SanityFAQ[]> {
  return [
    {
      _id: 'fallback-1',
      question: t('fallbacks.f1.q'),
      answer: t('fallbacks.f1.a'),
    },
    {
      _id: 'fallback-2',
      question: t('fallbacks.f2.q'),
      answer: t('fallbacks.f2.a'),
    },
    {
      _id: 'fallback-3',
      question: t('fallbacks.f3.q'),
      answer: t('fallbacks.f3.a'),
    },
  ];
}

function blocksToPlainText(blocks: unknown): string {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .map((block: { _type?: string; children?: Array<{ text?: string }> }) => {
      if (block._type === 'block' && Array.isArray(block.children)) {
        return block.children.map((child: { text?: string }) => child.text || '').join('');
      }
      return '';
    })
    .join('\n\n');
}

async function getFAQs(language: string, fallback: SanityFAQ[]): Promise<FAQ[]> {
  const raw = await safeFetch<SanityFAQ[]>(
    allFaqsQuery,
    { language },
    fallback,
    { next: { revalidate: 60, tags: ['sanity', 'sanity:faq'] } }
  );
  return raw.map((faq) => ({
    question: faq.question,
    answer: blocksToPlainText(faq.answer),
  }));
}

export default async function SanityFAQSection({ locale = 'no' }: SanityFAQSectionProps) {
  const t = await getTranslations("FAQ");
  const fallback = await getFallbackFAQs(t);
  const faqs = await getFAQs(locale, fallback);

  return (
    <section className="py-12 md:py-16 bg-[#050510]">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-12 text-center">
          {t('title')}
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between p-4 cursor-pointer text-white font-medium hover:bg-white/5 transition-colors">
                {faq.question}
                <span className="text-white/50 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="px-4 pb-4 text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
