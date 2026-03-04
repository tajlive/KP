import { NextRequest } from "next/server";

/**
 * SSE Price Endpoint — Server-Sent Events for clients that can't direct-connect to Binance WS.
 * Proxies Binance ticker data as SSE stream.
 *
 * Usage: GET /api/ws/prices?symbols=BTCUSDT,ETHUSDT
 *
 * Note: Vercel has a 30s timeout on serverless functions.
 * This endpoint reconnects automatically from the client side.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam
    ? symbolsParam
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    : ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isOpen = true;

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ symbols, timestamp: Date.now() })}\n\n`,
        ),
      );

      // Connect to Binance WS
      const streams = symbols.map((s) => `${s.toLowerCase()}@ticker`).join("/");
      const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

      let ws: WebSocket | null = null;

      try {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          if (!isOpen) return;
          try {
            const { data } = JSON.parse(event.data as string) as {
              data: {
                s: string;
                c: string;
                P: string;
                h: string;
                l: string;
                v: string;
                E: number;
              };
            };

            const payload = JSON.stringify({
              symbol: data.s,
              price: parseFloat(data.c),
              change24h: parseFloat(data.P),
              high24h: parseFloat(data.h),
              low24h: parseFloat(data.l),
              volume24h: parseFloat(data.v),
              timestamp: data.E,
            });

            controller.enqueue(
              encoder.encode(`event: price\ndata: ${payload}\n\n`),
            );
          } catch {
            // Ignore parse errors
          }
        };

        ws.onerror = () => {
          if (isOpen) {
            controller.enqueue(
              encoder.encode(
                `event: error\ndata: {"message":"WebSocket error"}\n\n`,
              ),
            );
          }
        };

        ws.onclose = () => {
          if (isOpen) {
            isOpen = false;
            controller.close();
          }
        };
      } catch {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: {"message":"Failed to connect"}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      // Heartbeat every 15s to prevent connection timeout
      const heartbeat = setInterval(() => {
        if (!isOpen) {
          clearInterval(heartbeat);
          return;
        }
        controller.enqueue(
          encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`),
        );
      }, 15_000);

      // Cleanup on client disconnect
      request.signal.addEventListener("abort", () => {
        isOpen = false;
        clearInterval(heartbeat);
        ws?.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
