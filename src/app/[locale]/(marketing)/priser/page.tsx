/**
 * Priser page — static HTML. Zero SSR, zero Worker crashes.
 * Cloudflare Workers compatible by design.
 */

const TIERS = [
  { name: "Student", price: "0", period: "Gratis", features: ["Papirhandel 100 000 kr", "1 auto-strategi", "AI-signaler", "Community-tilgang"], cta: "Start gratis", popular: false },
  { name: "Bachelor", price: "249", period: "kr/mnd", features: ["Alt i Student", "Live trading", "3 strategier", "Copy-trading (paper)"], cta: "Prøv gratis", popular: false },
  { name: "Master", price: "499", period: "kr/mnd", features: ["Alt i Bachelor", "7 strategier", "VIP-signaler", "Live copy-trading"], cta: "Start nå", popular: true },
  { name: "PhD", price: "999", period: "kr/mnd", features: ["Alt i Master", "Ubegrenset strategier", "1:1 rådgiver", "API-tilgang"], cta: "Start nå", popular: false },
  { name: "Professor", price: "1 999", period: "kr/mnd", features: ["Alt i PhD", "1:1 coaching", "Alpha-strategier", "Founder-gruppe"], cta: "Kontakt oss", popular: false },
];

export default function PriserPage() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href="/no" style={{ fontWeight: 700, fontSize: 20, color: "#0f172a", textDecoration: "none" }}>Klarpakke</a>
          <nav style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <a href="/no/login" style={{ color: "#475569", textDecoration: "none", fontSize: 14 }}>Logg inn</a>
            <a href="/no/register" style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>Registrer deg</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "80px 24px 40px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>Velg din plan</h1>
        <p style={{ fontSize: 18, color: "#64748b", maxWidth: 600, margin: "0 auto" }}>
          Start gratis, oppgrader når du er klar. Alle planer inkluderer papirhandel og AI-signaler.
        </p>
      </section>

      {/* Pricing grid */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              style={{
                background: "white",
                borderRadius: 16,
                border: tier.popular ? "2px solid #2563eb" : "1px solid #e2e8f0",
                padding: 24,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {tier.popular && (
                <span style={{
                  position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                  background: "#2563eb", color: "white", padding: "4px 12px", borderRadius: 99,
                  fontSize: 12, fontWeight: 700,
                }}>
                  Mest populær
                </span>
              )}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{tier.name}</h3>
              <div style={{ marginBottom: 16 }}>
                {tier.price === "0" ? (
                  <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>Gratis</span>
                ) : (
                  <>
                    <span style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{tier.price}</span>
                    <span style={{ fontSize: 14, color: "#64748b" }}> {tier.period}</span>
                  </>
                )}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", flex: 1 }}>
                {tier.features.map((f, i) => (
                  <li key={i} style={{ padding: "6px 0", fontSize: 14, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href={`/no/register?plan=${tier.name.toLowerCase()}`}
                style={{
                  display: "block", textAlign: "center", padding: "12px 0", borderRadius: 12,
                  fontSize: 14, fontWeight: 600, textDecoration: "none",
                  background: tier.popular ? "#2563eb" : "#f1f5f9",
                  color: tier.popular ? "white" : "#475569",
                }}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 32, fontSize: 13, color: "#94a3b8" }}>
          Alle priser inkl. MVA. Ingen bindingstid. Avslutt når som helst.
        </p>
      </section>
    </div>
  );
}
