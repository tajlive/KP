export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      const checks = {};

      try {
        const executeUrl = new URL("/api/paper-trading/execute", url.origin);
        const executeProbe = await fetch(executeUrl.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(5000),
        });
        const executeStatus = executeProbe.status;
        const executeHealthy = executeStatus !== 502 && executeStatus !== 503;
        let executeMessage = executeHealthy ? `HTTP ${executeStatus}` : null;
        if (!executeHealthy) {
          try { const body = await executeProbe.json(); executeMessage = body.error || `HTTP ${executeStatus}`; } catch { executeMessage = `HTTP ${executeStatus}`; }
        }
        checks.execute = { status: executeHealthy ? "ok" : "error", statusCode: executeStatus, message: executeMessage };
      } catch (err) {
        checks.execute = { status: "error", statusCode: null, message: "Probe feilet: " + (err.message || err) };
      }

      // Stripe
      const stripeKey = env.STRIPE_SECRET_KEY || "";
      if (!stripeKey) {
        checks.stripeApi = { status: "error", message: "STRIPE_SECRET_KEY mangler" };
      } else {
        try {
          const res = await fetch("https://api.stripe.com/v1/prices?limit=1", {
            headers: { Authorization: `Bearer ${stripeKey}` },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            checks.stripeApi = { status: "ok" };
          } else {
            const body = await res.json().catch(() => ({}));
            checks.stripeApi = { status: "error", message: body.error?.message || `HTTP ${res.status}` };
          }
        } catch (err) {
          checks.stripeApi = { status: "error", message: err.message || "Stripe utilgjengelig" };
        }
      }

      // Resend
      const resendKey = env.RESEND_API_KEY || "";
      if (!resendKey) {
        checks.resendApi = { status: "error", message: "RESEND_API_KEY mangler" };
      } else {
        try {
          const res = await fetch("https://api.resend.com/domains", {
            headers: { Authorization: `Bearer ${resendKey}` },
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            checks.resendApi = { status: "ok" };
          } else {
            const body = await res.json().catch(() => ({}));
            checks.resendApi = { status: "error", message: body.message || `HTTP ${res.status}` };
          }
        } catch (err) {
          checks.resendApi = { status: "error", message: err.message || "Resend utilgjengelig" };
        }
      }

      const hasError = Object.values(checks).some(c => c.status === "error");
      return new Response(JSON.stringify({
        status: hasError ? "degraded" : "healthy",
        timestamp: new Date().toISOString(),
        version: "health-worker-v2",
        checks,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      });
    }

    return fetch(request);
  },
};
