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

async function getTestimonials(): Promise<SanityTestimonial[]> {
  return safeFetch<SanityTestimonial[]>(
    activeTestimonialsQuery,
    {},
    [],
    { next: { revalidate: 60, tags: ['sanity', 'sanity:testimonial'] } }
  );
}

export default async function SanityTestimonials() {
  const rawItems = await getTestimonials();

  const items = rawItems.map((t) => ({
    name: t.name,
    role: t.role,
    text: t.quote,
    avatar: t.avatarUrl,
    rating: t.rating,
  }));

  return <Testimonials items={items.length > 0 ? items : undefined} />;
}
