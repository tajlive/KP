/**
 * DESIGN TOKENS SCHEMA
 * 
 * Styrer Tailwind CSS v4 design tokens fra Sanity CMS.
 * Endringer her reflekteres automatisk i applikasjonen.
 */

import { defineType, defineField } from 'sanity';

export const designTokens = defineType({
  name: 'designTokens',
  title: 'Design Tokens',
  type: 'document',
  __experimental_actions: ['update', 'publish'], // Kun oppdatering, ikke sletting
  
  fields: [
    defineField({
      name: 'title',
      title: 'Token Set Navn',
      type: 'string',
      initialValue: 'Klarpakke Design Tokens',
      readOnly: true,
    }),
    
    // BRAND COLORS
    defineField({
      name: 'brandColors',
      title: 'Brand Farger',
      type: 'object',
      fields: [
        { name: 'primary', title: 'Primær', type: 'color', initialValue: '#0052FF' },
        { name: 'primaryHover', title: 'Primær Hover', type: 'color', initialValue: '#0047E0' },
        { name: 'primaryLight', title: 'Primær Lys', type: 'color', initialValue: '#dbeafe' },
      ],
    }),
    
    // SEMANTIC COLORS
    defineField({
      name: 'semanticColors',
      title: 'Semantiske Farger',
      type: 'object',
      fields: [
        { name: 'success', title: 'Suksess', type: 'color', initialValue: '#22c55e' },
        { name: 'warning', title: 'Advarsel', type: 'color', initialValue: '#f59e0b' },
        { name: 'error', title: 'Feil', type: 'color', initialValue: '#ef4444' },
        { name: 'info', title: 'Info', type: 'color', initialValue: '#3b82f6' },
      ],
    }),
    
    // DARK MODE BACKGROUNDS
    defineField({
      name: 'darkMode',
      title: 'Dark Mode',
      type: 'object',
      fields: [
        { name: 'bgPrimary', title: 'Bakgrunn Primær', type: 'color', initialValue: '#0a0b0d' },
        { name: 'bgSecondary', title: 'Bakgrunn Sekundær', type: 'color', initialValue: '#161719' },
        { name: 'bgElevated', title: 'Bakgrunn Hevet', type: 'color', initialValue: '#1a1c24' },
        { name: 'textPrimary', title: 'Tekst Primær', type: 'color', initialValue: '#f1f5f9' },
        { name: 'textSecondary', title: 'Tekst Sekundær', type: 'color', initialValue: '#94a3b8' },
        { name: 'border', title: 'Kantlinje', type: 'color', initialValue: 'rgba(255,255,255,0.08)' },
      ],
    }),
    
    // TYPOGRAPHY
    defineField({
      name: 'typography',
      title: 'Typografi',
      type: 'object',
      fields: [
        { 
          name: 'fontFamily', 
          title: 'Font Familie', 
          type: 'string', 
          initialValue: 'Inter',
          options: {
            list: [
              { title: 'Inter', value: 'Inter' },
              { title: 'System UI', value: 'system-ui' },
            ],
          },
        },
        { name: 'baseFontSize', title: 'Base Font Størrelse (px)', type: 'number', initialValue: 16 },
      ],
    }),
    
    // SPACING SCALE
    defineField({
      name: 'spacing',
      title: 'Spacing',
      type: 'object',
      fields: [
        { name: 'unit', title: 'Base Unit (px)', type: 'number', initialValue: 4 },
        { name: 'scale', title: 'Multiplikator', type: 'number', initialValue: 1 },
      ],
    }),
    
    // BORDER RADIUS
    defineField({
      name: 'borderRadius',
      title: 'Avrunding',
      type: 'object',
      fields: [
        { name: 'button', title: 'Knapp (px)', type: 'number', initialValue: 12 },
        { name: 'card', title: 'Kort (px)', type: 'number', initialValue: 16 },
        { name: 'input', title: 'Input (px)', type: 'number', initialValue: 10 },
      ],
    }),
    
    // SHADOWS
    defineField({
      name: 'shadows',
      title: 'Skyggar',
      type: 'object',
      fields: [
        { name: 'card', title: 'Kort Skygge', type: 'string', initialValue: '0 4px 30px rgba(0, 0, 0, 0.1)' },
        { name: 'elevated', title: 'Hevet Skygge', type: 'string', initialValue: '0 20px 50px rgba(0, 0, 0, 0.3)' },
        { name: 'glow', title: 'Brand Glow', type: 'string', initialValue: '0 0 40px rgba(0, 82, 255, 0.3)' },
      ],
    }),
    
    // STATUS
    defineField({
      name: 'isActive',
      title: 'Aktiv',
      description: 'Sett til false for å bruke fallback verdier fra kode',
      type: 'boolean',
      initialValue: false, // Sikkerhet: default false til manuelt aktivert
    }),
    
    defineField({
      name: 'lastUpdated',
      title: 'Sist Oppdatert',
      type: 'datetime',
      readOnly: true,
      initialValue: () => new Date().toISOString(),
    }),
  ],
  
  preview: {
    select: {
      title: 'title',
      active: 'isActive',
      updated: 'lastUpdated',
    },
    prepare({ title, active, updated }) {
      return {
        title: title || 'Design Tokens',
        subtitle: `${active ? '✅ Aktiv' : '⏸️ Inaktiv'} - ${updated ? new Date(updated).toLocaleDateString('no') : 'Aldri'}`,
      };
    },
  },
});
