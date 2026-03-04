/**
 * Email Campaign Tools - Send campaigns and get stats
 */

import {
  getAvailableTemplates,
  getEmailAnalytics,
  sendBatchEmails,
} from "../clients/resend.ts";
import { getSupabase } from "../clients/supabase.ts";
import type { ToolOutput } from "../types.ts";

export async function sendCampaign(args: {
  audience: string;
  template: string;
  personalize?: boolean;
}): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    // Validate template
    const availableTemplates = getAvailableTemplates();
    if (!availableTemplates.includes(args.template)) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Unknown template: ${args.template}\nAvailable: ${availableTemplates.join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    // Build audience query
    let query = supabase.from("profiles").select("email, full_name, id");

    switch (args.audience) {
      case "all":
        // All users
        break;
      case "founders":
        query = query.eq("role", "founder");
        break;
      case "inactive":
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        query = query.lt("last_active", monthAgo.toISOString());
        break;
      default:
        // Custom query or all
        break;
    }

    const { data: recipients, error } = await query;

    if (error) throw error;

    if (!recipients || recipients.length === 0) {
      return {
        content: [
          { type: "text", text: "⚠️ No recipients found for this audience." },
        ],
      };
    }

    // Confirm before sending to large lists
    if (recipients.length > 100) {
      return {
        content: [
          {
            type: "text",
            text: `⚠️ Large campaign detected!

Audience: ${args.audience}
Template: ${args.template}
Recipients: ${recipients.length}

To confirm, call again with confirm: true`,
          },
        ],
      };
    }

    // Send emails
    // Get template function
    const templateFn = (data: any) => {
      // @ts-ignore - dynamic template access
      const tmpl = getTemplate(args.template);
      if (!tmpl) throw new Error(`Template not found: ${args.template}`);
      return tmpl(data);
    };

    const result = await sendBatchEmails(
      recipients.map((r) => ({
        ...r,
        email: r.email,
        first_name: r.full_name?.split(" ")[0],
      })),
      templateFn,
      50,
      1000,
    );

    // Log campaign
    await supabase.from("email_campaigns").insert([
      {
        name: `${args.template} - ${args.audience}`,
        audience: args.audience,
        template: args.template,
        sent_count: result.sent,
        failed_count: result.failed,
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
      },
    ]);

    return {
      content: [
        {
          type: "text",
          text: `📧 Campaign Sent!

Template: ${args.template}
Audience: ${args.audience}

Results:
  ✅ Sent: ${result.sent}
  ❌ Failed: ${result.failed}
  
${result.errors.length > 0 ? "Errors:\n" + result.errors.slice(0, 5).join("\n") : ""}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function getEmailStatsTool(args: {
  campaign_id?: string;
}): Promise<ToolOutput> {
  try {
    const stats = await getEmailAnalytics(args.campaign_id!);

    return {
      content: [
        {
          type: "text",
          text: `📊 Email Statistics

${args.campaign_id ? `Campaign: ${args.campaign_id}` : "All Campaigns"}

Delivery:
  Sent: ${stats.sent}
  Delivered: ${stats.delivered}
  Bounced: ${stats.bounced}

Engagement:
  Opened: ${stats.opened}
  Clicked: ${stats.clicked}
  Complained: ${stats.complained}
  Unsubscribed: ${stats.unsubscribed}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}

export async function listRecentCampaigns(): Promise<ToolOutput> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        content: [{ type: "text", text: "📭 No campaigns found." }],
      };
    }

    const campaigns = (data as any[])
      .map(
        (c, idx) => `
${idx + 1}. ${c.name}
   Sent: ${c.sent_count} | Failed: ${c.failed_count || 0}
   Date: ${new Date(c.sent_at || c.created_at).toLocaleDateString("no-NO")}
`,
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `📧 Recent Campaigns\n${campaigns}`,
        },
      ],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return {
      content: [{ type: "text", text: `❌ Error: ${error}` }],
      isError: true,
    };
  }
}
