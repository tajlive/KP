#!/usr/bin/env node
/**
 * mcp-graceful-exit.mjs — no-op MCP server ved manglende env
 * Bruk istedenfor process.exit(1).
 * KIMI viser "(0 tools)" istedenfor "failed".
 *
 * Fixes:
 * - notifications/* ignoreres (ingen respons) — MCP-spec krever det
 * - id: null sendes aldri i error-respons (Pydantic validerer ikke null-id)
 */
export function gracefulExit(missingVars, serverName = "mcp-server") {
  const missing = Array.isArray(missingVars) ? missingVars : [missingVars];
  process.stderr.write(`[${serverName}] Mangler: ${missing.join(", ")} — starter no-op MCP\n`);

  process.stdin.setEncoding("utf8");
  let buf = "";

  process.stdin.on("data", (chunk) => {
    buf += chunk;
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }

      // Notifications har ingen id og skal aldri besvares
      if (!msg.method) continue;
      if (msg.method.startsWith("notifications/")) continue;

      // Kun requests med gyldig id skal besvares
      if (msg.id === undefined || msg.id === null) continue;

      if (msg.method === "initialize") {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0", id: msg.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: serverName, version: "0.0.0" }
          }
        }) + "\n");
      } else if (msg.method === "tools/list") {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0", id: msg.id, result: { tools: [] }
        }) + "\n");
      } else {
        // Alle andre requests — svar med tom result
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0", id: msg.id, result: {}
        }) + "\n");
      }
    }
  });

  process.stdin.on("end", () => process.exit(0));
}
