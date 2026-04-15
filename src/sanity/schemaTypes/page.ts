import type { Rule } from 'sanity'

export default {
  name: 'page',
  type: 'document',
  title: 'Side',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Tittel',
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'URL-slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule: Rule) => Rule.required(),
    },
    {
      name: 'metaTitle',
      type: 'string',
      title: 'Meta-tittel (SEO)',
      description: 'Tittel som vises i søkemotorer',
    },
    {
      name: 'metaDescription',
      type: 'text',
      title: 'Meta-beskrivelse (SEO)',
      description: 'Beskrivelse som vises i søkemotorer',
      rows: 3,
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
      name: 'content',
      type: 'array',
      title: 'Innhold',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            {
              name: 'alt',
              type: 'string',
              title: 'Alt-tekst',
              description: 'Beskriv bildet for skjermlesere',
            },
            {
              name: 'caption',
              type: 'string',
              title: 'Bildetekst',
            },
          ],
        },
        {
          type: 'object',
          name: 'cta',
          title: 'Call-to-Action',
          fields: [
            { name: 'text', type: 'string', title: 'Tekst' },
            { name: 'link', type: 'string', title: 'Lenke' },
            {
              name: 'style',
              type: 'string',
              title: 'Stil',
              options: {
                list: [
                  { title: 'Primær', value: 'primary' },
                  { title: 'Sekundær', value: 'secondary' },
                  { title: 'Utlinjet', value: 'outline' },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'datetime',
      title: 'Publisert',
      initialValue: () => new Date().toISOString(),
    },
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      language: 'language',
    },
    prepare(selection: { title?: string; slug?: string; language?: string }) {
      return {
        title: selection.title,
        subtitle: `/${selection.language}/${selection.slug}`,
      }
    },
  },
}
