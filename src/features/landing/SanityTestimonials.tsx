import { safeFetch } from '@/lib/sanity/client';
import { activeTestimonialsQuery } from '@/lib/sanity/queries';
import { Star } from 'lucide-react';
import Image from 'next/image';

interface SanityTestimonial {
  _id: string;
  name: string;
  role: string;
  quote: string;
  avatarUrl?: string;
  rating: number;
  platform?: string;
}

interface TestimonialItem {
  name: string;
  role: string;
  text: string;
  avatar?: string;
  rating: number;
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

  const items: TestimonialItem[] = rawItems.map((t) => ({
    name: t.name,
    role: t.role,
    text: t.quote,
    avatar: t.avatarUrl,
    rating: t.rating,
  }));

  if (items.length === 0) return null;

  return (
    <section className="py-20 bg-[#050510]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Hva våre brukere sier
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Se hva andre sier om å lære trading med Klarpakke
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${
                      j < item.rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'
                    }`}
                  />
                ))}
              </div>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                {item.avatar ? (
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                    {item.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{item.name}</p>
                  <p className="text-white/50 text-xs">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
