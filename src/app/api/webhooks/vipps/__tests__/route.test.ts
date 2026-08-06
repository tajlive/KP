import { describe, expect, it, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { createHash, createHmac } from "crypto";

/**
 * P0-6 regresjonstest: Vipps-webhook signaturvalidering (fail-closed).
 *
 * Tidligere: POST validerte INGENTING — alltid 200, uavhengig av hvem som
 * kalte. Nå: HMAC-SHA256-verifisering i henhold til Vipps' offisielle
 * spesifikasjon; manglende secret → 503; ugyldig signatur → 401.
 */

const SECRET = "test-vipps-webhook-secret";

function signVippsRequest(body: string, headers: { date: string; host: string; pathAndQuery: string }) {
  const contentHash = createHash("sha256").update(body).digest("base64");
  const signedString = `POST\n${headers.pathAndQuery}\n${headers.date};${headers.host};${contentHash}`;
  const signature = createHmac("sha256", SECRET).update(signedString).digest("base64");
  const authorization = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`;
  return { contentHash, authorization };
}

import { POST } from "@/app/api/webhooks/vipps/route";

const envBackup = {
  secret: process.env.VIPPS_WEBHOOK_SECRET,
};

function buildRequest(body: string, overrides: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/webhooks/vipps", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ms-date": "Thu, 30 Mar 2023 08:38:32 GMT",
      host: "localhost",
      ...overrides,
    },
    body,
  });
}

describe("P0-6: Vipps webhook — signaturvalidering", () => {
  beforeEach(() => {
    process.env.VIPPS_WEBHOOK_SECRET = SECRET;
  });

  afterAll(() => {
    if (envBackup.secret !== undefined) {
      process.env.VIPPS_WEBHOOK_SECRET = envBackup.secret;
    } else {
      delete process.env.VIPPS_WEBHOOK_SECRET;
    }
  });

  it("gyldig signatur → 200 og hendelsen prosesseres", async () => {
    const body = JSON.stringify({
      orderId: "order-123",
      merchantSerialNumber: "100001",
      eventType: "payment.captured",
    });
    const { contentHash, authorization } = signVippsRequest(body, {
      date: "Thu, 30 Mar 2023 08:38:32 GMT",
      host: "localhost",
      pathAndQuery: "/api/webhooks/vipps",
    });

    const res = await POST(
      buildRequest(body, {
        "x-ms-content-sha256": contentHash,
        authorization,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("manglende VIPPS_WEBHOOK_SECRET → 503 (fail-closed, aldri åpen)", async () => {
    delete process.env.VIPPS_WEBHOOK_SECRET;

    const body = JSON.stringify({ orderId: "order-123" });
    const res = await POST(buildRequest(body));
    expect(res.status).toBe(503);
  });

  it("ugyldig signatur → 401 (endret innhold)", async () => {
    const body = JSON.stringify({ orderId: "order-123", amount: 1000 });
    const tamperedBody = JSON.stringify({ orderId: "order-123", amount: 9999 }); // angriper endrer beløp
    const { contentHash, authorization } = signVippsRequest(body, {
      date: "Thu, 30 Mar 2023 08:38:32 GMT",
      host: "localhost",
      pathAndQuery: "/api/webhooks/vipps",
    });

    const res = await POST(
      buildRequest(tamperedBody, {
        "x-ms-content-sha256": contentHash, // gammel hash matcher ikke ny body
        authorization,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("manglende signatur-headers → 401", async () => {
    const body = JSON.stringify({ orderId: "order-123" });
    const res = await POST(buildRequest(body));
    expect(res.status).toBe(401);
  });

  it("feil secret (angriper bruker egen) → 401", async () => {
    const body = JSON.stringify({ orderId: "order-123" });
    // Signer med FEIL secret
    const contentHash = createHash("sha256").update(body).digest("base64");
    const signedString = `POST\n/api/webhooks/vipps\nThu, 30 Mar 2023 08:38:32 GMT;localhost;${contentHash}`;
    const signature = createHmac("sha256", "attacker-secret").update(signedString).digest("base64");

    const res = await POST(
      buildRequest(body, {
        "x-ms-content-sha256": contentHash,
        authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("verifyVippsSignature: ugyldig JSON-body → 500 (ingen krasj i 401-sjekk)", async () => {
    // Valid signatur over ugyldig JSON — validering passerer, JSON.parse feiler → 500
    const rawBody = "{not-json";
    const { contentHash, authorization } = signVippsRequest(rawBody, {
      date: "Thu, 30 Mar 2023 08:38:32 GMT",
      host: "localhost",
      pathAndQuery: "/api/webhooks/vipps",
    });

    const res = await POST(
      buildRequest(rawBody, {
        "x-ms-content-sha256": contentHash,
        authorization,
      }),
    );
    expect(res.status).toBe(500);
  });
});
