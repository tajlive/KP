import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getErrorMessage } from "@/lib/utils/error";

export async function GET(request: Request) {
  // P0-fiks (2026-08-06): ruten var helt ubeskyttet — service-role-klient
  // eksponerte user_profiles (epost/navn) anonymt. requireAdmin verifiserer
  // cookie-sesjon + admin-allowlist, og returnerer service-role-klient.
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }
  const supabase = auth.supabase;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10", 10), 1), 100);

  try {
    const { data: recentUsers, error } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, display_name, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!recentUsers || recentUsers.length === 0) {
      return NextResponse.json({ users: [], is_fallback: false });
    }

    const formatted = recentUsers.map((user) => ({
      id: user.id,
      name: user.full_name || user.display_name || "Anonym",
      email: user.email,
      source: "direct",
      time_ago: getTimeAgo(new Date(user.created_at)),
    }));

    return NextResponse.json({ users: formatted, is_fallback: false });
  } catch (error) {
    console.error("Recent users error:", getErrorMessage(error));
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "nå nettopp";
  if (minutes < 60) return `${minutes} min siden`;
  if (hours < 24) return `${hours} t siden`;
  if (days < 7) return `${days} dager siden`;
  return date.toLocaleDateString("no-NO");
}
