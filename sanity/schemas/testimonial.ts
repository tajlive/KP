export default {
  name: 'testimonial',
  type: 'document',
  title: 'Tilbakemelding',
  fields: [
    {
      name: 'name',
      type: 'string',
      title: 'Navn',
      validation: (Rule: any) => Rule.required(),
    },
    {
      name: 'role',
      type: 'string',
      title: 'Rolle/Jobb',
    },
    {
      name: 'quote',
      type: 'text',
      title: 'Sitat',
      rows: 4,
      validation: (Rule: any) => Rule.required(),
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
      validation: (Rule: any) => Rule.min(1).max(5),
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
};
