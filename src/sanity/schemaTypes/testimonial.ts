import type { Rule } from 'sanity'
import type React from 'react'

export default {
  name: 'testimonial',
  type: 'document',
  title: 'Tilbakemelding',
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'avatar',
      rating: 'rating',
      active: 'isActive',
    },
    prepare({ title, subtitle, media, rating, active }: { title?: string; subtitle?: string; media?: string | React.ReactNode; rating?: number; active?: boolean }) {
      const stars = rating ? '★'.repeat(rating) : ''
      const status = active === false ? ' — 🚫 Skjult' : ''
      return {
        title: title ?? 'Ukjent',
        subtitle: `${stars}${status}${subtitle ? ' — ' + subtitle : ''}`,
        media,
      }
    },
  },
  fields: [
    {
      name: 'name',
      type: 'string',
      title: 'Navn',
      validation: (Rule: Rule) => Rule.required(),
    },
    { name: 'role', type: 'string', title: 'Rolle/Jobb' },
    {
      name: 'quote',
      type: 'text',
      title: 'Sitat',
      rows: 4,
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'avatar',
      type: 'image',
      title: 'Bilde',
      options: { hotspot: true },
    },
    {
      name: 'rating',
      type: 'number',
      title: 'Vurdering (1-5)',
      validation: (Rule: Rule) => Rule.min(1).max(5),
    },
    {
      name: 'platform',
      type: 'string',
      title: 'Plattform',
      options: {
        list: [
          { title: 'Trustpilot', value: 'trustpilot' },
          { title: 'Google', value: 'google' },
          { title: 'Facebook', value: 'facebook' },
          { title: 'Direkte', value: 'direct' },
        ],
      },
    },
    {
      name: 'isActive',
      type: 'boolean',
      title: 'Vis på siden',
      initialValue: true,
    },
  ],
}
