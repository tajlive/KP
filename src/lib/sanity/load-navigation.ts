import { client } from "@/lib/sanity/client";
import { navigationQuery } from "@/lib/sanity/queries";
import { withRequestCache } from "@/lib/cache";
import {
  FALLBACK_NAVIGATION,
  type NavigationData,
} from "@/lib/navigation/config";

async function loadNavigationImpl(): Promise<NavigationData> {
  try {
    const result = await client.fetch(
      navigationQuery,
      {},
      { next: { tags: ["sanity:navigation"] } },
    );
    if (result) {
      return {
        loggedOutLinks: [
          ...(result.loggedOutLinks || FALLBACK_NAVIGATION.loggedOutLinks),
          { label: "Pilot", path: "/pilot", order: 99 },
        ],
        loggedInLinks: [
          ...(result.loggedInLinks || FALLBACK_NAVIGATION.loggedInLinks),
          { label: "Pilot", path: "/pilot", order: 99 },
        ],
      };
    }
  } catch {
    // Use fallback
  }
  return FALLBACK_NAVIGATION;
}

const cachedLoadNavigation = withRequestCache(loadNavigationImpl, {
  key: "sanity-navigation",
  tags: ["sanity", "sanity:navigation"],
  revalidate: 60,
});

export async function loadNavigation(): Promise<NavigationData> {
  return cachedLoadNavigation();
}
