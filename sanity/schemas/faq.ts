export default {
  name: 'faq',
  type: 'document',
  title: 'FAQ',
  fields: [
    {
      name: 'question',
      type: 'string',
      title: 'Spørsmål',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'answer',
      type: 'array',
      title: 'Svar',
      of: [{ type: 'block' }],
      validation: (Rule: any) => Rule.required(),
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
};
