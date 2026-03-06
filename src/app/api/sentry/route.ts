import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const envelope = await req.text();
    const headerLine = envelope.split("\n")[0];
    const header = JSON.parse(headerLine);

    if (!header.dsn) {
      return NextResponse.json(
        { error: "No DSN found in envelope" },
        { status: 400 },
      );
    }

    const dsn = new URL(header.dsn);
    const projectId = dsn.pathname.replace("/", "");

    // Use the host from the DSN (e.g., o4509555622608896.ingest.de.sentry.io)
    // instead of hardcoding sentry.io
    const url = `https://${dsn.host}/api/${projectId}/envelope/`;

    const res = await fetch(url, {
      method: "POST",
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    });

    return new Response(null, { status: res.status });
  } catch (err) {
    console.error("[Sentry Tunnel Request Error]:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
