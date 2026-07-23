import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Dynamiske OpenGraph-bilder (1200x630).
// Varianter: default | result | rank — valgt via ?variant=
// Tekst: ?lang=no|en. Data via query (kun ikke-sensitivt, offentlig delbart innhold).
// Fallback ved feil: redirect til statisk /og-image.png.

const WIDTH = 1200;
const HEIGHT = 630;

// Stabile font-URL-er (Fontsource via jsDelivr). Cachet på modulnivå i Worker-instansen.
const FONT_URLS = {
  regular:
    "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-700-normal.woff",
};

let fontsPromise: Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> | null =
  null;

function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      fetch(FONT_URLS.regular).then((r) => r.arrayBuffer()),
      fetch(FONT_URLS.bold).then((r) => r.arrayBuffer()),
    ]).then(([regular, bold]) => ({ regular, bold }));
  }
  return fontsPromise;
}

const TEXTS = {
  no: {
    tagline: "Lær kryptotrading — uten risiko",
    sub: "Paper trading med ekte markedsdata. Norsk plattform.",
    resultTitle: "Mine resultater",
    trades: "handler",
    winRate: "win rate",
    pnl: "P&L",
    rankTitle: "Toppsjiktet på Klarpakke",
    rankLabel: "plassering",
  },
  en: {
    tagline: "Learn crypto trading — without risk",
    sub: "Paper trading on real market data. Norwegian platform.",
    resultTitle: "My results",
    trades: "trades",
    winRate: "win rate",
    pnl: "P&L",
    rankTitle: "Klarpakke leaderboard",
    rankLabel: "rank",
  },
} as const;

function Wordmark() {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "#0052ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 32,
          fontWeight: 700,
          marginRight: 20,
        }}
      >
        K
      </div>
      <div style={{ color: "white", fontSize: 44, fontWeight: 700 }}>
        Klarpakke
      </div>
    </div>
  );
}

function ChartBars() {
  // Dekorativ stigende "equity curve" bygget av div-er (satori-sikker).
  const heights = [40, 55, 48, 70, 62, 85, 78, 100, 92, 118, 110, 140];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        height: 140,
        marginTop: 40,
      }}
    >
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: 28,
            height: h,
            background: i === heights.length - 1 ? "#3d7aff" : "#1f3a8f",
            borderRadius: 6,
            marginRight: 12,
          }}
        />
      ))}
    </div>
  );
}

function StatBox({
  value,
  label,
  color = "white",
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#161719",
        border: "1px solid #26282f",
        borderRadius: 20,
        padding: "28px 36px",
        marginRight: 24,
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 24, color: "#9ca3af" }}>{label}</div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const variant = searchParams.get("variant") ?? "default";
    const lang = searchParams.get("lang") === "en" ? "en" : "no";
    const t = TEXTS[lang];

    const { regular, bold } = await loadFonts();

    let body;
    if (variant === "result") {
      const pnl = searchParams.get("pnl") ?? "+0 kr";
      const winRate = searchParams.get("winrate") ?? "0";
      const trades = searchParams.get("trades") ?? "0";
      const pnlColor = pnl.startsWith("-") ? "#f87171" : "#34d399";
      body = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#9ca3af", marginBottom: 16 }}>
            {t.resultTitle}
          </div>
          <div style={{ display: "flex", marginTop: 12 }}>
            <StatBox value={pnl} label={t.pnl} color={pnlColor} />
            <StatBox value={`${winRate}%`} label={t.winRate} />
            <StatBox value={trades} label={t.trades} />
          </div>
        </div>
      );
    } else if (variant === "rank") {
      const rank = searchParams.get("rank") ?? "–";
      body = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, color: "#9ca3af", marginBottom: 16 }}>
            {t.rankTitle}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 140,
              fontWeight: 700,
              color: "#3d7aff",
              lineHeight: 1,
            }}
          >
            {`#${rank}`}
          </div>
          <div style={{ fontSize: 28, color: "#9ca3af", marginTop: 8 }}>
            {t.rankLabel}
          </div>
        </div>
      );
    } else {
      body = (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "white",
              lineHeight: 1.15,
              maxWidth: 640,
            }}
          >
            {t.tagline}
          </div>
          <div style={{ fontSize: 28, color: "#9ca3af", marginTop: 20 }}>
            {t.sub}
          </div>
          <ChartBars />
        </div>
      );
    }

    const image = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0b0d",
          padding: 56,
          fontFamily: "Inter",
        }}
      >
        <Wordmark />
        {body}
        <div
          style={{
            display: "flex",
            height: 8,
            borderRadius: 4,
            background: "linear-gradient(90deg, #0052ff, #3d7aff, #34d399)",
          }}
        />
      </div>
    );

    return new ImageResponse(image, {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    // Fail-safe: statisk PNG alltid tilgjengelig
    return Response.redirect(new URL("/og-image.png", req.url), 302);
  }
}
