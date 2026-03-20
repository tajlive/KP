import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["no", "en"],
  defaultLocale: "no",
  localePrefix: "as-needed",
  // Viktig: ikke bruk Accept-Language til å omdirigere /dashboard → /en/dashboard.
  // Da «velger» brukeren NO, men neste request/middleware sender dem tilbake til engelsk.
  // Standardlocale er norsk; engelsk bruker /en/... eksplisitt i URL.
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
