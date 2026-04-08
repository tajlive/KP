/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path are handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can customize the behavior of this page by configuring the `tool` property of the `defineConfig` function in `sanity.config.ts`.
 *
 * To learn more about how to configure Sanity Studio, visit the documentation:
 * https://www.sanity.io/docs/sanity-studio-overview
 */

import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';

export const dynamic = 'force-static';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <NextStudio config={config} />;
}
