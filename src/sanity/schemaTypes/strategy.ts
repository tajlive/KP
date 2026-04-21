import type { Rule } from 'sanity'

export default {
  name: 'strategy',
  type: 'document',
  title: 'Trading Strategi',
  preview: {
    select: {
      title: 'name',
      riskLevel: 'riskLevel',
      icon: 'icon',
      active: 'isActive',
    },
    prepare({ title, riskLevel, icon, active }: { title?: string; riskLevel?: number; icon?: string; active?: boolean }) {
      const risk = riskLevel ? `Risiko ${'▓'.repeat(riskLevel)}${'░'.repeat(5 - riskLevel)}` : ''
      const status = active === false ? ' — ⏸️ Inaktiv' : ' — ✅ Aktiv'
      return {
        title: `${icon ?? '🤖'} ${title ?? 'Ukjent strategi'}`,
        subtitle: `${risk}${status}`,
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
    {
      name: 'slug',
      type: 'slug',
      title: 'Slug',
      options: { source: 'name' },
    },
    {
      name: 'description',
      type: 'text',
      title: 'Beskrivelse',
      rows: 3,
    },
    {
      name: 'longDescription',
      type: 'array',
      title: 'Lang Beskrivelse',
      of: [{ type: 'block' }],
    },
    {
      name: 'riskLevel',
      type: 'number',
      title: 'Risiko-nivå (1-5)',
      validation: (Rule: Rule) => Rule.min(1).max(5),
    },
    {
      name: 'indicators',
      type: 'array',
      title: 'Indikatorer',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    },
    {
      name: 'icon',
      type: 'string',
      title: 'Ikon (emoji)',
    },
    {
      name: 'color',
      type: 'string',
      title: 'Farge',
      options: {
        list: [
          { title: 'Blå', value: 'blue' },
          { title: 'Grønn', value: 'green' },
          { title: 'Rød', value: 'red' },
          { title: 'Gul', value: 'yellow' },
          { title: 'Lilla', value: 'purple' },
        ],
      },
    },
    {
      name: 'isActive',
      type: 'boolean',
      title: 'Aktiv',
      initialValue: true,
    },
    { name: 'stopLoss', type: 'number', title: 'Stop Loss %' },
    { name: 'takeProfit', type: 'number', title: 'Take Profit %' },
  ],
}
