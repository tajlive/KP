'use client';

// DEPRECATED: This component is no longer used in the new Nordic Trust design

interface Testimonial {
  id: string;
  quote: string;
  author: string;
  role: string;
  company?: string;
  rating: number;
  verified?: boolean;
  avatar?: string;
}

export function Testimonials({ testimonials, autoRotate, interval }: { testimonials: Testimonial[]; autoRotate?: boolean; interval?: number }) {
  return null;
}

export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return null;
}

export default Testimonials;
