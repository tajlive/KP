"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { StrategyType } from "./trading-api";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
