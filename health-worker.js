export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Kun /api/health — alt annet sendes videre til Next.js
    if (url.pathname === "/api/health" && request.method === "GET") {
      return new Response(JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "health-worker",
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Videresend til Next.js worker
    return fetch(request);
  },
};
