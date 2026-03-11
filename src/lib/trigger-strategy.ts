"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { StrategyType } from "./trading-api";
import { safeStorage } from "@/lib/supabase/safe-storage";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: safeStorage,
    },
  }
);

export async function triggerStrategyRun(
  strategyType: StrategyType,
  mode: "paper" | "live",
) {
  const { data, error } = await supabase.functions.invoke("strategy-runner", {
    body: { strategy: strategyType, mode },
  });

  if (error) throw error;
  return data;
}
