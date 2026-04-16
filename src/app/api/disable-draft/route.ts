import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Disable Sanity preview mode (draft mode)
 */
export async function GET() {
  const draft = await draftMode();
  draft.disable();
  redirect('/');
}
