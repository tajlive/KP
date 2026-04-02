// Sentry client config - DISABLED
// Initialization moved to instrumentation-client.ts for route-gated init
// This prevents double initialization and allows marketing route exclusion

// Export empty init to satisfy Sentry SDK expectations
export const init = () => {};
