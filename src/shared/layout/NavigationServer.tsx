import { client } from "@/lib/sanity/client";
import { navigationQuery } from "@/lib/sanity/queries";
import {
  FALLBACK_NAVIGATION,
  type NavigationData,
} from "@/lib/navigation/config";
import { MarketingNavigation } from "./MarketingNavigation";
import { getLocale } from "next-intl/server";

export type { NavigationData } from "@/lib/navigation/config";

export async function NavigationServer() {
  let navData: NavigationData = FALLBACK_NAVIGATION;
  const locale = await getLocale();

  try {
    const result = await client.fetch(navigationQuery);
    if (result) {
      navData = {
        loggedOutLinks: result.loggedOutLinks || navData.loggedOutLinks,
        loggedInLinks: result.loggedInLinks || navData.loggedInLinks,
      };
    }
  } catch {
    // Fallback til hardkodede lenker hvis Sanity ikke er tilgjengelig
  }

  return <MarketingNavigation navData={navData} locale={locale} />;
}
