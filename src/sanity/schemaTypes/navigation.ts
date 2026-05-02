import { defineType, defineField } from 'sanity'

export default defineType({
  name: 'navigation',
  title: 'Navigasjon',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tittel',
      type: 'string',
      initialValue: 'Hovednavigasjon',
      readOnly: true,
    }),
    defineField({
      name: 'loggedOutLinks',
      title: 'Lenker — Ikke pålogget',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Tekst', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'path', title: 'URL-sti', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'order', title: 'Rekkefølge', type: 'number', initialValue: 0 },
          ],
        },
      ],
      description: 'Navigasjonslenker vist når brukeren IKKE er pålogget',
    }),
    defineField({
      name: 'loggedInLinks',
      title: 'Lenker — Pålogget',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Tekst', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'path', title: 'URL-sti', type: 'string', validation: (Rule) => Rule.required() },
            { name: 'order', title: 'Rekkefølge', type: 'number', initialValue: 0 },
          ],
        },
      ],
      description: 'Navigasjonslenker vist når brukeren ER pålogget',
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
