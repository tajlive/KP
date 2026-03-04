import { getSupabase } from "../clients/supabase.ts";

/**
 * Update the system prompt for the AI Coach
 */
export async function updateCoachSystemPrompt(args: {
  new_prompt: string;
  version_note?: string;
}) {
  const supabase = getSupabase();

  const { data: _data, error } = await supabase
    .from("ai_config")
    .upsert({
      key: "coach_system_prompt",
      value: args.new_prompt,
      metadata: { note: args.version_note || "Updated via MCP" },
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    return {
      content: [
        { type: "text", text: `Error updating prompt: ${error.message}` },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `AI Coach system prompt updated successfully.\nNote: ${args.version_note || "N/A"}`,
      },
    ],
  };
}

/**
 * Get AI token usage and analytics
 */
interface AIUsageLog {
  tokens?: number;
  cost?: number;
  [key: string]: any;
}

export async function getAIUsageAnalytics(args: { days?: number }) {
  const supabase = getSupabase();
  const days = args.days || 7;

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .gte(
      "created_at",
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    );

  if (error) {
    return {
      content: [
        { type: "text", text: `Error fetching AI usage: ${error.message}` },
      ],
      isError: true,
    };
  }

  const totalTokens =
    (data as AIUsageLog[] | null)?.reduce(
      (acc: number, log: AIUsageLog) => acc + (log.tokens || 0),
      0,
    ) || 0;
  const totalCost =
    (data as AIUsageLog[] | null)?.reduce(
      (acc: number, log: AIUsageLog) => acc + (log.cost || 0),
      0,
    ) || 0;

  return {
    content: [
      {
        type: "text",
        text: `AI Usage (Last ${days} days):\n- Total Tokens: ${totalTokens.toLocaleString()}\n- Estimated Cost: $${totalCost.toFixed(4)}\n- Total Requests: ${data?.length || 0}`,
      },
    ],
  };
}
