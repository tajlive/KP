import express from "express";
import { Readable } from "node:stream";
import { getConfig } from "./config.js";
import { getValidAccessToken } from "./auth.js";
import type { BridgeConfig } from "./config.js";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";

const MODELS = [
  {
    id: "kimi-k2-7-code",
    object: "model",
    created: 1716566400,
    owned_by: "moonshot",
  },
  {
    id: "kimi-k2-6",
    object: "model",
    created: 1716566400,
    owned_by: "moonshot",
  },
  {
    id: "kimi-k2-5",
    object: "model",
    created: 1716566400,
    owned_by: "moonshot",
  },
  {
    id: "moonshot-v1-8k",
    object: "model",
    created: 1704067200,
    owned_by: "moonshot",
  },
  {
    id: "moonshot-v1-32k",
    object: "model",
    created: 1704067200,
    owned_by: "moonshot",
  },
  {
    id: "moonshot-v1-128k",
    object: "model",
    created: 1704067200,
    owned_by: "moonshot",
  },
];

function log(
  config: BridgeConfig,
  level: "debug" | "info" | "warn" | "error",
  message: string
): void {
  const levels: Record<typeof level, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };
  if (levels[level] < levels[config.logLevel]) return;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

function requireApiKey(config: BridgeConfig, req: express.Request, res: express.Response): boolean {
  const auth = req.headers.authorization;
  const expected = `Bearer ${config.bridgeApiKey}`;
  if (!config.bridgeApiKey || auth !== expected) {
    res.status(401).json({
      error: {
        message: "Invalid or missing bridge API key",
        type: "authentication_error",
      },
    });
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  const config = getConfig();

  if (!config.bridgeApiKey) {
    console.error(
      "BRIDGE_API_KEY is not set. Set a strong key before starting the bridge."
    );
    process.exit(1);
  }

  const app = express();
  app.use(express.json({ limit: "20mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/v1/models", (req, res) => {
    if (!requireApiKey(config, req, res)) return;
    res.json({ object: "list", data: MODELS });
  });

  app.post("/v1/chat/completions", async (req, res) => {
    if (!requireApiKey(config, req, res)) return;

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(config);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(config, "error", `Token error: ${message}`);
      res.status(401).json({
        error: {
          message,
          type: "authentication_error",
        },
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (!body || typeof body !== "object") {
      res.status(400).json({
        error: {
          message: "Request body must be a JSON object",
          type: "invalid_request_error",
        },
      });
      return;
    }

    log(config, "info", `Proxying chat completion for model ${String(body.model || "unknown")}`);

    try {
      const kimiResponse = await fetch(KIMI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: req.headers.accept || "application/json",
        },
        body: JSON.stringify(body),
      });

      res.status(kimiResponse.status);
      kimiResponse.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower === "content-encoding" || lower === "transfer-encoding") {
          return;
        }
        try {
          res.setHeader(key, value);
        } catch {
          // Ignore header-setting errors for edge-case headers.
        }
      });

      if (kimiResponse.body) {
        const nodeStream = Readable.fromWeb(
          kimiResponse.body as ReadableStream<Uint8Array>
        );
        nodeStream.pipe(res);
      } else {
        const text = await kimiResponse.text();
        res.send(text);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(config, "error", `Proxy error: ${message}`);
      res.status(502).json({
        error: {
          message: `Failed to reach Kimi API: ${message}`,
          type: "api_error",
        },
      });
    }
  });

  app.listen(config.port, () => {
    log(config, "info", `Kimi OAuth bridge listening on http://localhost:${config.port}`);
    log(config, "info", `OpenAI-compatible endpoint: http://localhost:${config.port}/v1/chat/completions`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
