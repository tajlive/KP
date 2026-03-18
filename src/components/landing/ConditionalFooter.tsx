"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

const APP_ROUTES = ["/dashboard", "/admin", "/paper-trading"];

export function ConditionalFooter() {
  const pathname = usePathname();

  // Hide footer on authenticated app pages (dashboard, admin, trading screens)
  const isAppRoute = APP_ROUTES.some((route) =>
    (pathname ?? "/").includes(route),
  );
  if (isAppRoute) return null;

  return <Footer />;
}
