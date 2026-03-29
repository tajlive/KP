// Legg til i next.config.mjs:
// headers: async () => [...],
// Automatisk caching for statiske API-routes
export const cacheConfig = {
  async headers() {
    return [
      {
        source: '/api/signal/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' }],
      },
      {
        source: '/api/trading/history/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
      {
        source: '/api/analytics/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, s-maxage=300, stale-while-revalidate=600' }],
      },
    ]
  }
}
