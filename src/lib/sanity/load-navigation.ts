import { client } from "@/lib/sanity/client";
import { navigationQuery } from "@/lib/sanity/queries";
import type { NavigationData } from "@/shared/layout/NavigationServer";

const fallbackNavData: NavigationData = {
  loggedOutLinks: [
    { label: "Lær", path: "/kurs", order: 0 },
    { label: "Trade", path: "/paper-trading", order: 1 },
    { label: "Bots", path: "/auto-trading", order: 2 },
    { label: "Priser", path: "/priser", order: 3 },
  ],
  loggedInLinks: [
    { label: "Dashboard", path: "/dashboard", order: 0 },
    { label: "Portefølje", path: "/dashboard/portfolio", order: 1 },
    { label: "Trade", path: "/dashboard/trade", order: 2 },
    { label: "Bots", path: "/dashboard/auto-trade", order: 3 },
    { label: "Lær", path: "/kurs", order: 4 },
    { label: "Priser", path: "/priser", order: 5 },
  ],
};

export async function loadNavigation(): Promise<NavigationData> {
  try {
    const result = await client.fetch(
      navigationQuery,
      {},
      { next: { tags: ["sanity:navigation"] } },
    );
    if (result) {
      return {
        loggedOutLinks: result.loggedOutLinks || fallbackNavData.loggedOutLinks,
        loggedInLinks: result.loggedInLinks || fallbackNavData.loggedInLinks,
      };
    }
  } catch {
    // Use fallback
  }
  return fallbackNavData;
}
