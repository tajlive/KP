/**
 * Priser page — static HTML. Zero SSR, zero Worker crashes.
 * Cloudflare Workers compatible by design.
 * Premium dark glassmorphism with gold CTA — JokerTrade theme.
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
    <div className="min-h-screen bg-[#0A0B0D]" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header className="nav-glass px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="/no" className="font-bold text-xl text-[#F9FAFB] no-underline">Klarpakke</a>
          <nav className="flex gap-4 items-center">
            <a href="/no/login" className="text-[#9CA3AF] no-underline text-sm hover:text-[#F9FAFB] transition-colors">Logg inn</a>
            <a href="/no/register" className="btn-accent text-sm px-4 py-2 no-underline">Registrer deg</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#F9FAFB] mb-4 tracking-tight">
          Velg din plan
        </h1>
        <p className="text-lg text-[#9CA3AF] max-w-xl mx-auto leading-relaxed">
          Start gratis, oppgrader når du er klar. Alle planer inkluderer papirhandel og AI-signaler.
        </p>
      </section>

      {/* Pricing grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl p-6 backdrop-blur-xl transition-all duration-200 hover-lift ${
                tier.popular
                  ? "bg-[#1A1D26]/90 border-2 border-[#F59E0B] shadow-lg shadow-amber-500/10"
                  : "bg-[#1A1D26]/70 border border-[#2A2D35] hover:border-[#3A3D45]"
              }`}
            >
              {tier.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F59E0B] text-[#0A0B0D] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                  🎲 Mest populær
                </span>
              )}
              <h3 className="text-xl font-bold text-[#F9FAFB] mb-3">{tier.name}</h3>
              <div className="mb-4">
                {tier.price === "0" ? (
                  <span className="text-3xl font-extrabold text-[#F9FAFB]">Gratis</span>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-[#F9FAFB]">{tier.price}</span>
                    <span className="text-sm text-[#6B7280] ml-1"> {tier.period}</span>
                  </>
                )}
              </div>
              <ul className="list-none p-0 m-0 flex-1 space-y-2 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="text-sm text-[#9CA3AF] flex items-center gap-2">
                    <span className="text-[#10B981] font-bold shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={`/no/register?plan=${tier.name.toLowerCase()}`}
                className={`block text-center py-3 rounded-xl text-sm font-semibold no-underline transition-all duration-200 ${
                  tier.popular
                    ? "bg-[#F59E0B] text-[#0A0B0D] hover:bg-[#D97706] hover:shadow-lg hover:shadow-amber-500/20 active:scale-[0.98]"
                    : "bg-[#2A2D35] text-[#F9FAFB] hover:bg-[#3A3D45] active:scale-[0.98]"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="text-center mt-8 text-xs text-[#6B7280]">
          Alle priser inkl. MVA. Ingen bindingstid. Avslutt når som helst.
        </p>
      </section>
    </div>
  );
}
