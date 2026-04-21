"use client";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { StrategyType } from "./trading-api";

const supabase = getSupabaseClient();

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
