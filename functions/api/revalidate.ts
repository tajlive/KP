export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * On-demand revalidation — trigges av GitHub Actions etter deploy.
 * Krever ?secret=<REVALIDATE_SECRET> og ?path=/<path> (flere path-parametre støttes).
 */
async function GETHandler(request: Request, env: Env)(request: NextRequest) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.REVALIDATE_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { 'Content-Type': 'application/json', ..., { status: 401 }.headers || {} }, status: , { status: 401 }.status || 200 });
  }

  const paths = new URL(request.url).searchParams.getAll("path");
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


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;
    if (method === 'GET') {
      return GETHandler(request, env);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
