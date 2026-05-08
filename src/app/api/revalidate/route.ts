import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation — trigges av GitHub Actions etter deploy.
 * Krever ?secret=<REVALIDATE_SECRET> og ?path=/<path> (flere path-parametre støttes).
 */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const paths = request.nextUrl.searchParams.getAll("path");
  if (paths.length === 0) {
    return NextResponse.json(
      { error: "Missing ?path= parameter" },
      { status: 400 }
    );
  }

  const results = paths.map((p) => {
    try {
      revalidatePath(p);
      return { path: p, ok: true };
    } catch (e) {
      return { path: p, ok: false, error: (e as Error).message };
    }
  });

  const allOk = results.every((r) => r.ok);
  return NextResponse.json(
    { revalidated: results },
    { status: allOk ? 200 : 207 }
  );
}
