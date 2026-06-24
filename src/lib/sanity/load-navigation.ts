import { client } from "@/lib/sanity/client";
import { navigationQuery } from "@/lib/sanity/queries";
import {
  FALLBACK_NAVIGATION,
  type NavigationData,
} from "@/lib/navigation/config";

export async function loadNavigation(): Promise<NavigationData> {
  try {
    const result = await client.fetch(
      navigationQuery,
      {},
      { next: { tags: ["sanity:navigation"] } },
    );
    if (result) {
      return {
        loggedOutLinks: result.loggedOutLinks || FALLBACK_NAVIGATION.loggedOutLinks,
        loggedInLinks: result.loggedInLinks || FALLBACK_NAVIGATION.loggedInLinks,
      };
    }
  } catch {
    // Use fallback
  }
  return FALLBACK_NAVIGATION;
}
