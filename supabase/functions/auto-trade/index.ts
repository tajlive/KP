// DEPRECATED: auto-trading is now handled by /api/cron/tick
// This function is kept for one release to avoid breaking deployed schedules.
// Remove after 2026-08-01.

Deno.serve(() => {
  console.warn("auto-trade edge function is deprecated; use /api/cron/tick");
  return new Response(
    JSON.stringify({ ok: false, deprecated: true }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    },
  );
});
