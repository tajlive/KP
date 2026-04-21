/**
 * Sanity Configuration — Production / Embedded Studio
 *
 * Embedded studio:        https://www.klarpakke.no/studio
 * Sanity Manage:          https://www.sanity.io/manage/project/63qn23si
 * Dataset:                production
 * API Version:            2024-04-07
 *
 * RULES:
 * - basePath MUST stay /studio (embedded mode)
 * - productionUrl MUST stay undefined (prevents iframe loop)
 * - projectId/dataset/apiVersion MUST match env / sanity.cli.ts
 * - Do NOT add preview iframe plugins in embedded mode
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {apiVersion, dataset, projectId} from './sanity/env'
import {schema} from './sanity/schemaTypes'
import {structure} from './sanity/structure'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: apiVersion}),
  ],
  document: {
    // Disable preview iframe in embedded mode to prevent self-referencing loop
    productionUrl: undefined,
  },
})
