import { safeFetch } from '@/lib/sanity/client';
import { allFaqsQuery } from '@/lib/sanity/queries';
import { FAQList, type FAQ } from './FAQList';
import { getTranslations } from 'next-intl/server';

interface SanityFAQ {
  _id: string;
  question: string;
  answer: string | unknown[];
}

interface SanityFAQSectionProps {
  locale?: string;
}

async function getFallbackFAQs(t: any): Promise<SanityFAQ[]> {
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
    .map((block: any) => {
      if (block._type === 'block' && Array.isArray(block.children)) {
        return block.children.map((child: any) => child.text || '').join('');
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
  return <FAQList faqs={faqs} />;
}
