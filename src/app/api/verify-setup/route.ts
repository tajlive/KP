import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/utils/error";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 25)}...`
        : false,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
    },
    connection: false,
    tables: {
      users: false,
      leagues: false,
      push_subscriptions: false,
    },
    error: null as string | null,
  };

  try {
    const supabase = await createClient();

    // Check connection by fetching a public table (or users if RLS allows)
    // We try to fetch 1 row from 'users'
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (!usersError) {
      status.connection = true;
      status.tables.users = true;
    } else {
      console.error("Users table check failed:", getErrorMessage(usersError));
    }

    // Check leagues
    const { error: leaguesError } = await supabase
      .from("leagues")
      .select("count")
      .limit(1);
    if (!leaguesError) status.tables.leagues = true;

    // Check push_subscriptions
    const { error: pushError } = await supabase
      .from("push_subscriptions")
      .select("count")
      .limit(1);
    if (!pushError) status.tables.push_subscriptions = true;

    return NextResponse.json(status);
  } catch (err: unknown) {
    status.error = getErrorMessage(err);
    return NextResponse.json(status, { status: 500 });
  }
}
