import { redirect } from "next/navigation";

// Root page — redirect to default locale (no).
// Middleware (i18n redirect) is deaktivert pga worker size limit.
export default function RootPage() {
  redirect("/no");
}
