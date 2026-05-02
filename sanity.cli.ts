/**
 * Sanity CLI Configuration
 *
 * Configures the Sanity CLI for:
 * - API access (projectId, dataset)
 * - Deployment settings (appId for klarpakke.sanity.studio)
 *
 * This file is read by `npx sanity` commands automatically.
 * Keep projectId/dataset in sync with src/sanity/env.ts and
 * both sanity.config.ts files.
 *
 * Manage project: https://www.sanity.io/manage/project/63qn23si
 */

import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '63qn23si',
    dataset: 'production',
  },
  deployment: {
    appId: 'bgcrua5r8d9yyh5927fa4xu7',
  },
})
