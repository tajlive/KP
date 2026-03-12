import { redirect } from "next/navigation";

/**
 * Root page - redirects to default locale (/no)
 * The actual landing page is at /[locale]/page.tsx
 */
export default function RootPage() {
  redirect("/no");
}
