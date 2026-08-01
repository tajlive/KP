import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redirect to unified /trade?tab=auto (2026-08-01 merge) */
export default function AutoTradePage() {
  redirect("/trade?tab=auto");
}
