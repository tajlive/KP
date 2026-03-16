import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const start = performance.now();

  try {
    // Sjekk admin-tilgang
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { status: "error", message: "Ikke autentisert", latencyMs: 0 },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { status: "error", message: "Krever admin-tilgang", latencyMs: 0 },
        { status: 403 }
      );
    }

    // Sjekk GitHub Actions status
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "GITHUB_TOKEN mangler",
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.github.com/repos/tajlive/KP/actions/runs?per_page=1",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `GitHub API feil: ${response.status}`,
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const latestRun = data.workflow_runs?.[0];

    if (!latestRun) {
      return NextResponse.json({
        status: "ok",
        message: "Ingen workflow-runs funnet",
        latencyMs: Math.round(performance.now() - start),
      });
    }

    const status =
      latestRun.status === "completed" && latestRun.conclusion === "success"
        ? "ok"
        : "error";

    return NextResponse.json({
      status,
      message: `Siste kjøring: ${latestRun.name} (${latestRun.status}$${
        latestRun.conclusion ? ` / ${latestRun.conclusion}` : ""
      })`,
      latencyMs: Math.round(performance.now() - start),
      details: {
        workflowName: latestRun.name,
        status: latestRun.status,
        conclusion: latestRun.conclusion,
        createdAt: latestRun.created_at,
        htmlUrl: latestRun.html_url,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Ukjent feil",
        latencyMs: Math.round(performance.now() - start),
      },
      { status: 500 }
    );
  }
}
