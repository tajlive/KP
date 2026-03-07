import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Klarpakke — Lær krypto. Øv med lekepenger. Tjen når du er klar.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0A0B0D",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo + Navn */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #F7931A 0%, #F7C17A 100%)",
              marginRight: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            ₿
          </div>
          <span
            style={{
              fontSize: "44px",
              fontWeight: "700",
              color: "#FFFFFF",
              letterSpacing: "-1px",
            }}
          >
            Klarpakke
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "58px",
            fontWeight: "800",
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: "28px",
            letterSpacing: "-2px",
            maxWidth: "1000px",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span>Lær krypto. </span>
          <span style={{ color: "#F7931A" }}>Øv med lekepenger.</span>
          <span> Tjen når du er klar.</span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "22px",
            color: "#9CA3AF",
            textAlign: "center",
            maxWidth: "760px",
            marginBottom: "44px",
          }}
        >
          Norges eneste plattform som kombinerer kurs, autotrading og papirhandel
        </p>

        {/* Pills */}
        <div style={{ display: "flex", gap: "14px" }}>
          {["Kurs", "Autotrading", "Papirhandel"].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(247, 147, 26, 0.12)",
                border: "1px solid rgba(247, 147, 26, 0.45)",
                borderRadius: "50px",
                padding: "10px 22px",
                fontSize: "18px",
                fontWeight: "600",
                color: "#F7931A",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
