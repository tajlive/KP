/**
 * KIMI Bridge — Minimal MCP-wrapper (EKSEMPEL / TEMPLATE)
 *
 * Dette er et utgangspunkt for en lokal MCP-server som wrapper KIMI CLI.
 * MÅ kobles til faktisk MCP runtime (f.eks. @modelcontextprotocol/sdk)
 * før den kan brukes i produksjon.
 */

interface Command {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<string>;
}

const ALLOWLIST: Map<string, Command> = new Map([
  [
    "kimi_code",
    {
      name: "kimi_code",
      handler: async (args) => {
        const filePath = args.filePath as string;
        const instruction = args.instruction as string;
        if (!isWithinRepo(filePath)) {
          throw new Error(`Path ${filePath} is outside repo root`);
        }
        // TODO: Integrer med faktisk KIMI CLI-kall
        return `OK: code operation on ${filePath}`;
      },
    },
  ],
  [
    "kimi_ci",
    {
      name: "kimi_ci",
      handler: async () => {
        // TODO: Kjør npm run lint && npm run type-check && npm run test:unit
        return "OK: CI gate passed";
      },
    },
  ],
  [
    "kimi_db_status",
    {
      name: "kimi_db_status",
      handler: async () => {
        // TODO: Kjør npm run db:status eller tilsvarende
        return "OK: DB status fetched";
      },
    },
  ],
  [
    "kimi_monitor_full",
    {
      name: "kimi_monitor_full",
      handler: async () => {
        // TODO: Kjør npm run health:prod:gate eller tilsvarende
        return "OK: Monitor full completed";
      },
    },
  ],
]);

const REPO_ROOT = "/Users/taj/klarpakke";

function isWithinRepo(filePath: string): boolean {
  const resolved = new URL(filePath, `file://${REPO_ROOT}/`).pathname;
  return resolved.startsWith(REPO_ROOT);
}

async function execute(commandName: string, args: Record<string, unknown>): Promise<string> {
  const cmd = ALLOWLIST.get(commandName);
  if (!cmd) {
    throw new Error(`Command ${commandName} is not in allowlist`);
  }
  return cmd.handler(args);
}

// TODO: Knytt execute() til MCP-serverens request/response-løkke.
// Se docs/agent-bridge.md for arkitektur og setup.

export { execute, ALLOWLIST, isWithinRepo };
