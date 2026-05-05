import { draftMode } from "next/headers";
import { SanityLive } from "@/sanity/lib/live";

/**
 * Only renders <SanityLive /> when draft mode is active.
 * This avoids bundling the live-reload listener in production builds
 * and prevents unnecessary WebSocket connections for end users.
 */
export async function SanityLiveWrapper() {
  const isDraft = await draftMode()
    .then((d) => d.isEnabled)
    .catch(() => false);

  if (!isDraft) return null;

  return <SanityLive />;
}
