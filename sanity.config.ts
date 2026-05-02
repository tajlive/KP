/**
 * Sanity CLI Configuration
 *
 * This file is used by Sanity CLI commands (deploy, manage, etc.)
 * It lives in the project root because Sanity CLI looks here.
 *
 * The embedded Next.js studio uses src/sanity.config.ts instead,
 * which reads from environment variables. This file uses hardcoded
 * fallbacks because Sanity CLI does not have access to Next.js
 * env vars at build time.
 *
 * Embedded studio: https://www.klarpakke.no/studio
 * Deployed studio: https://klarpakke.sanity.studio/
 * Sanity Manage:   https://www.sanity.io/manage/project/63qn23si
 */

// IMPORTANT: Keep this in sync with src/sanity.config.ts
// Any schema or plugin changes must be mirrored in both files.

import {assist} from '@sanity/assist'
import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

// Hardcoded values for CLI builds (sanity deploy does not read .env.local)
const projectId = '63qn23si'
const dataset = 'production'
const apiVersion = '2024-04-07'

import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'

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
