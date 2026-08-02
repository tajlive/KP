/**
 * DRIFTSFEIL — statisk side uten Supabase-avhengighet
 *
 * Vises når middleware oppdager manglende NEXT_PUBLIC_SUPABASE_*
 * og redirecter beskyttede ruter hit.
 * Ingen import av @/lib/supabase/* eller next-intl (holdes helt isolert).
 */
export const dynamic = "force-static";

export default function DriftsfeilPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0A0B0D]">
      <div className="max-w-md w-full rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80 backdrop-blur-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#7F1D1D]/60 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-[#EF4444]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] mb-3">
          Vi har en driftsfeil
        </h1>
        <p className="text-[#9CA3AF] mb-2 leading-relaxed">
          Teamet er varslet. Ingen data er tapt — prøv igjen om litt.
        </p>
        <p className="text-xs text-[#6B7280] mt-6">
          Sist oppdatert:{" "}
          <span suppressHydrationWarning>
            {new Date().toLocaleDateString("no-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
      </div>
    </div>
  );
}
