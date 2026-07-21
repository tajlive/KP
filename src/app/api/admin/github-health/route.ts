import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  const start = performance.now();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return NextResponse.json(
        {
          status: "error",
          message:
            auth.status === 401 ? "Ikke autentisert" : "Krever admin-tilgang",
          latencyMs: 0,
        },
        { status: auth.status },
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
        { status: 500 },
      );
    }

    const response = await fetch(
      "https://api.github.com/repos/tajlive/KP/actions/runs?per_page=1",
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          status: "error",
          message: `GitHub API feil: ${response.status}`,
          latencyMs: Math.round(performance.now() - start),
        },
        { status: 502 },
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
      { status: 500 },
    );
  }
}
