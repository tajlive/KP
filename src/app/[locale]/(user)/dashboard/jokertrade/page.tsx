import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redirect to unified /trade?tab=stats (2026-08-01 merge) */
export default function JokerTradeDashboardPage() {
  redirect("/trade?tab=stats");
}
