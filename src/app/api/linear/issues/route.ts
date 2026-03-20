import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createClient } from "@/lib/supabase/server";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_API_URL = "https://api.linear.app/graphql";

async function linearQuery(query: string, variables?: Record<string, unknown>) {
  const fetchResponse = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: LINEAR_API_KEY || "",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!fetchResponse.ok) {
    throw new Error(`Linear API error: ${fetchResponse.status}`);
  }

  const data = await fetchResponse.json();
  if (data.errors) {
    throw new Error(data.errors[0].message);
  }

  return data.data;
}

// GET /api/linear/issues - List issues
export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(req, response);
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    if (!LINEAR_API_KEY) {
      return NextResponse.json(
        { error: "LINEAR_API_KEY ikke konfigurert" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(req.url);
    const state = searchParams.get("state");
    const limit = parseInt(searchParams.get("limit") || "50");

    const query = `
      query Issues($filter: IssueFilter, $first: Int) {
        issues(filter: $filter, first: $first) {
          nodes {
            id
            identifier
            title
            state {
              name
              color
            }
            assignee {
              name
              email
            }
            team {
              name
            }
            priority
            createdAt
            updatedAt
          }
        }
      }
    `;

    const variables: Record<string, unknown> = { first: limit };
    if (state) {
      variables.filter = { state: { name: { eq: state } } };
    }

    const data = await linearQuery(query, variables);

    return NextResponse.json({
      success: true,
      issues: data.issues.nodes,
    });
  } catch (error) {
    console.error("Linear API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}

// POST /api/linear/issues - Create issue
export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.next();
    const supabaseAuth = createServerClient(req, response);
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
    }

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Ingen tilgang" }, { status: 403 });
    }

    if (!LINEAR_API_KEY) {
      return NextResponse.json(
        { error: "LINEAR_API_KEY ikke konfigurert" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const { title, teamId, description, priority = 0 } = body;

    if (!title || !teamId) {
      return NextResponse.json(
        { error: "Tittel og teamId kreves" },
        { status: 400 },
      );
    }

    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            state {
              name
            }
            url
          }
        }
      }
    `;

    const data = await linearQuery(mutation, {
      input: {
        title,
        teamId,
        description,
        priority,
      },
    });

    return NextResponse.json({
      success: true,
      issue: data.issueCreate.issue,
    });
  } catch (error) {
    console.error("Linear API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ukjent feil" },
      { status: 500 },
    );
  }
}
