import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

/**
 * Enable Sanity preview mode (draft mode)
 *
 * Usage from Sanity Studio:
 * https://klarpakke.no/api/draft?slug=/&secret=SANITY_PREVIEW_SECRET
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  if (!secret || secret !== process.env.SANITY_PREVIEW_SECRET) {
    return new Response('Invalid token', { status: 401 });
  }

  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  redirect(slug);
}
