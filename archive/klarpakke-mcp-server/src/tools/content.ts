import { getSupabase } from "../clients/supabase.ts";

/**
 * Update course content
 */
export async function updateCourseContent(args: {
  course_id: string;
  updates: Record<string, any>;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("courses")
    .update(args.updates)
    .eq("id", args.course_id)
    .select();

  if (error) {
    return {
      content: [
        { type: "text", text: `Error updating course: ${error.message}` },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Successfully updated course ${args.course_id}.\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Update lesson content
 */
export async function updateLesson(args: {
  lesson_id: string;
  updates: Record<string, any>;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lessons")
    .update(args.updates)
    .eq("id", args.lesson_id)
    .select();

  if (error) {
    return {
      content: [
        { type: "text", text: `Error updating lesson: ${error.message}` },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Successfully updated lesson ${args.lesson_id}.\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Set global website metrics (the factual data)
 */
export async function setWebsiteMetrics(args: {
  metrics: {
    total_profit_percentage?: string;
    years_tested?: number;
    active_users_count?: number;
  };
}) {
  const supabase = getSupabase();

  // This tool updates a global configuration table or metadata
  const { data, error } = await supabase
    .from("site_config")
    .upsert({
      id: "global_metrics", // Fixed ID for global stats
      data: args.metrics,
      updated_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error updating website metrics: ${error.message}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Successfully updated website metrics.\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}
