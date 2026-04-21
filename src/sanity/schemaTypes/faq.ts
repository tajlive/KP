import type { Rule } from 'sanity'

export default {
  name: 'faq',
  type: 'document',
  title: 'FAQ',
  preview: {
    select: {
      title: 'question',
      subtitle: 'category',
      active: 'language',
    },
    prepare({ title, subtitle, active }: { title?: string; subtitle?: string; active?: string }) {
      const cat = subtitle ? `[${subtitle}] ` : ''
      const lang = active === 'en' ? '🇬🇧' : '🇳🇴'
      return {
        title: title ?? 'Ukjent spørsmål',
        subtitle: `${lang} ${cat}`,
      }
    },
  },
  fields: [
    {
      name: 'question',
      type: 'string',
      title: 'Spørsmål',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'answer',
      type: 'array',
      title: 'Svar',
      of: [{ type: 'block' }],
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'category',
      type: 'string',
      title: 'Kategori',
      options: {
        list: [
          { title: 'Generelt', value: 'general' },
          { title: 'Trading', value: 'trading' },
          { title: 'Betaling', value: 'billing' },
          { title: 'Sikkerhet', value: 'security' },
          { title: 'Teknisk', value: 'technical' },
        ],
      },
    },
    {
      name: 'language',
      type: 'string',
      title: 'Språk',
      options: {
        list: [
          { title: 'Norsk', value: 'no' },
          { title: 'Engelsk', value: 'en' },
        ],
      },
      initialValue: 'no',
    },
    {
      name: 'order',
      type: 'number',
      title: 'Rekkefølge',
      description: 'Lavere tall vises først',
      initialValue: 0,
    },
  ],
}
