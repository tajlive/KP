import type { StructureResolver } from 'sanity/structure'
import {
  HomeIcon,
  ComposeIcon,
  StarIcon,
  RobotIcon,
  HelpCircleIcon,
  ColorWheelIcon,
  DocumentIcon,
} from '@sanity/icons'

// Singleton-typer (kun ett dokument per type)
const SINGLETONS = ['landingContent', 'designTokens']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Klarpakke CMS')
    .items([
      // ─── Landingsside (singleton) ────────────────────────────────
      S.listItem()
        .title('🏠 Landingsside')
        .icon(HomeIcon)
        .child(
          S.document()
            .schemaType('landingContent')
            .documentId('landingContent')
            .title('Landingsside Innhold')
        ),

      S.divider(),

      // ─── Innhold ─────────────────────────────────────────────────
      S.listItem()
        .title('📄 Sider')
        .icon(DocumentIcon)
        .child(S.documentTypeList('page').title('Sider')),

      S.listItem()
        .title('❓ FAQ')
        .icon(HelpCircleIcon)
        .child(S.documentTypeList('faq').title('FAQ')),

      S.listItem()
        .title('⭐ Tilbakemeldinger')
        .icon(StarIcon)
        .child(S.documentTypeList('testimonial').title('Tilbakemeldinger')),

      S.divider(),

      // ─── Trading ─────────────────────────────────────────────────
      S.listItem()
        .title('🤖 Trading Strategier')
        .icon(RobotIcon)
        .child(S.documentTypeList('strategy').title('Strategier')),

      S.listItem()
        .title('📝 Trade Forklaringer')
        .icon(ComposeIcon)
        .child(S.documentTypeList('tradeExplanation').title('Trade Forklaringer')),

      S.divider(),

      // ─── Design (singleton) ──────────────────────────────────────
      S.listItem()
        .title('🎨 Design Tokens')
        .icon(ColorWheelIcon)
        .child(
          S.document()
            .schemaType('designTokens')
            .documentId('designTokens')
            .title('Design Tokens')
        ),
    ])
