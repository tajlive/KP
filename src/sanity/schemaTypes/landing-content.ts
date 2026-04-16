export default {
  name: 'landingContent',
  type: 'document',
  title: 'Landingsside Innhold',
  fields: [
    {
      name: 'heroTitle',
      type: 'object',
      title: 'Hero Tittel',
      fields: [
        { name: 'line1', type: 'string', title: 'Linje 1' },
        { name: 'line2', type: 'string', title: 'Linje 2' },
      ],
    },
    {
      name: 'heroSubtitle',
      type: 'text',
      title: 'Hero Undertittel',
      rows: 2,
    },
    {
      name: 'heroCta',
      type: 'object',
      title: 'Hero CTA',
      fields: [
        { name: 'text', type: 'string', title: 'Tekst' },
        { name: 'link', type: 'string', title: 'Lenke' },
      ],
    },
    {
      name: 'trustBadges',
      type: 'array',
      title: 'Trust Badges',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'text', type: 'string', title: 'Tekst' },
            { name: 'icon', type: 'string', title: 'Ikon (emoji)' },
          ],
        },
      ],
    },
    {
      name: 'kltTeaser',
      type: 'object',
      title: 'KLT Teaser',
      fields: [
        { name: 'title', type: 'string', title: 'Tittel' },
        { name: 'description', type: 'text', title: 'Beskrivelse', rows: 2 },
        { name: 'ctaText', type: 'string', title: 'CTA Tekst' },
        { name: 'ctaLink', type: 'string', title: 'CTA Lenke' },
      ],
    },
    {
      name: 'socialProof',
      type: 'object',
      title: 'Social Proof',
      fields: [
        { name: 'headline', type: 'string', title: 'Overskrift' },
        {
          name: 'stats',
          type: 'array',
          title: 'Statistikk',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'value', type: 'string', title: 'Verdi' },
                { name: 'label', type: 'string', title: 'Etikett' },
                { name: 'icon', type: 'string', title: 'Ikon (Lucide-navn)' },
              ],
            },
          ],
        },
        {
          name: 'perks',
          type: 'array',
          title: 'Fordeler',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'title', type: 'string', title: 'Tittel' },
                { name: 'description', type: 'text', title: 'Beskrivelse', rows: 2 },
                { name: 'color', type: 'string', title: 'Farge (f.eks. from-blue-500 to-indigo-600)' },
                { name: 'icon', type: 'string', title: 'Ikon (Lucide-navn)' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'pricingHeader',
      type: 'object',
      title: 'Pricing Header',
      fields: [
        { name: 'title', type: 'string', title: 'Tittel' },
        { name: 'subtitle', type: 'text', title: 'Undertittel', rows: 2 },
      ],
    },
    {
      name: 'features',
      type: 'array',
      title: 'Funksjoner',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'title', type: 'string', title: 'Tittel' },
            { name: 'description', type: 'text', title: 'Beskrivelse', rows: 2 },
            { name: 'icon', type: 'string', title: 'Ikon (emoji)' },
          ],
        },
      ],
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
  ],
}
