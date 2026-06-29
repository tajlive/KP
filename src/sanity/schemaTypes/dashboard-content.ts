export default {
  name: 'dashboardContent',
  type: 'document',
  title: 'Dashboard Innhold',
  __experimental_actions: ['update', 'publish'],
  preview: {
    select: { title: 'heroCtaText' },
    prepare({ title }: { title?: string }) {
      return {
        title: title ?? 'Dashboard Innhold',
        subtitle: 'Innhold for dashboard-siden',
      }
    },
  },
  fields: [
    {
      name: 'heroCtaText',
      type: 'string',
      title: 'Hero CTA Tekst',
      description: 'Tekst på hovedknappen under saldoen (f.eks. "Start trading")',
      initialValue: 'Start trading',
    },
    {
      name: 'heroCtaLink',
      type: 'string',
      title: 'Hero CTA Lenke',
      description: 'Relativ lenke (f.eks. /handel?mode=paper)',
      initialValue: '/handel?mode=paper',
    },
    {
      name: 'smartActions',
      type: 'array',
      title: 'Smart Actions',
      description: 'Context-aware CTA-kort som vises under portfolio-chart',
      of: [
        {
          type: 'object',
          preview: {
            select: { title: 'title', subtitle: 'condition' },
          },
          fields: [
            {
              name: 'condition',
              type: 'string',
              title: 'Tilstand',
              description: 'Når skal dette vises: newUser | paperMode | liveMode | noSession',
              options: {
                list: [
                  { title: 'Ny bruker', value: 'newUser' },
                  { title: 'Paper mode', value: 'paperMode' },
                  { title: 'Live mode', value: 'liveMode' },
                  { title: 'Ingen sesjon', value: 'noSession' },
                ],
              },
            },
            { name: 'title', type: 'string', title: 'Tittel' },
            { name: 'description', type: 'text', title: 'Beskrivelse', rows: 2 },
            { name: 'ctaText', type: 'string', title: 'CTA Tekst' },
            { name: 'ctaLink', type: 'string', title: 'CTA Lenke' },
            { name: 'icon', type: 'string', title: 'Ikon (Lucide-navn)', initialValue: 'TrendingUp' },
            {
              name: 'color',
              type: 'string',
              title: 'Farge',
              initialValue: 'blue',
              options: {
                list: [
                  { title: 'Blå', value: 'blue' },
                  { title: 'Grønn', value: 'green' },
                  { title: 'Lilla', value: 'purple' },
                  { title: 'Amber', value: 'amber' },
                ],
              },
            },
          ],
        },
      ],
    },
    {
      name: 'upgradeBanner',
      type: 'object',
      title: 'Upgrade Banner',
      fields: [
        { name: 'title', type: 'string', title: 'Tittel', initialValue: '🚀 Klar for neste nivå?' },
        { name: 'description', type: 'text', title: 'Beskrivelse', rows: 2, initialValue: 'Oppgrader til Bachelor for live trading, avanserte strategier og prioritet support.' },
        { name: 'ctaText', type: 'string', title: 'CTA Tekst', initialValue: 'Se priser' },
        { name: 'ctaLink', type: 'string', title: 'CTA Lenke', initialValue: '/priser' },
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
