import { safeFetch } from '@/lib/sanity/client';
import { activeTestimonialsQuery } from '@/lib/sanity/queries';
import { Testimonials } from './Testimonials';

interface SanityTestimonial {
  _id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
  rating: number;
  platform?: string;
}

interface SanityTestimonialsProps {
  locale?: string;
}

async function getTestimonials(language: string): Promise<SanityTestimonial[]> {
  return safeFetch<SanityTestimonial[]>(
    activeTestimonialsQuery,
    {},
    [],
    { next: { revalidate: 60, tags: ['sanity', 'sanity:testimonial'] } }
  );
}

export default async function SanityTestimonials({ locale = 'no' }: SanityTestimonialsProps) {
  const rawItems = await getTestimonials(locale);

  const items = rawItems.map((t) => ({
    name: t.name,
    role: t.role,
    text: t.quote,
    avatar: t.avatarUrl,
    rating: t.rating,
  }));

  return <Testimonials language={locale as 'no' | 'en'} items={items.length > 0 ? items : undefined} />;
}
