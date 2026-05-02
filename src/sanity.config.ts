/**
 * Sanity Configuration — Embedded Next.js Studio
 *
 * This config is used by the embedded Next.js Studio at /studio.
 * It is imported by src/app/studio/[[...tool]]/Studio.tsx via the
 * `@/sanity.config` path alias.
 *
 * For Sanity CLI commands (deploy, manage, etc.), use the root
 * sanity.config.ts instead, which has hardcoded fallbacks for
 * env variables that are not available during CLI builds.
 *
 * Embedded studio: https://www.klarpakke.no/studio
 * Deployed studio: https://klarpakke.sanity.studio/
 * Sanity Manage:   https://www.sanity.io/manage/project/63qn23si
 * Dataset:         production
 * API Version:     2024-04-07
 *
 * RULES:
 * - basePath MUST stay /studio (embedded mode)
 * - productionUrl MUST stay undefined (prevents iframe loop)
 * - projectId/dataset/apiVersion MUST match env / sanity.cli.ts / root sanity.config.ts
 * - Do NOT add preview iframe plugins in embedded mode
 */

import {assist} from '@sanity/assist'
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
    assist(),
  ],
  document: {
    // Disable preview iframe in embedded mode to prevent self-referencing loop
    productionUrl: undefined,
  },
})
