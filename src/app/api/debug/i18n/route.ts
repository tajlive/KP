import { getMessages } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await getMessages();
    return Response.json({
      ok: true,
      hasTrading: !!messages?.trading,
      hasGamification: !!messages?.gamification,
      hasDashboard: !!messages?.dashboard,
      tradingStrategies: Object.keys(messages?.trading?.strategies || {}),
      dashboardError: typeof messages?.dashboard?.error,
      gamificationKeys: Object.keys(messages?.gamification || {}),
    });
  } catch (err) {
    return Response.json({
      ok: false,
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
