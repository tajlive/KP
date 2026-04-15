import { type SchemaTypeDefinition } from 'sanity'

import page from './page'
import landingContent from './landing-content'
import strategy from './strategy'
import tradeExplanation from './trade-explanation'
import faq from './faq'
import testimonial from './testimonial'
import { designTokens } from './design-tokens'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    page,
    landingContent,
    strategy,
    tradeExplanation,
    faq,
    testimonial,
    designTokens,
  ],
}
