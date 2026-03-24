import dynamic from "next/dynamic";
import { SURFACE } from "@/lib/design/tokens";

/**
 * Unngår React #418 (hydration mismatch) på /handelshistorikk: innhold avhenger av
 * Supabase-session, polling og intl-formatering som ofte divergerer SSR vs første client-render.
 * Siden er bak innlogging — client-only mount er OK.
 */
const ClientHandelshistorikk = dynamic(
  () => import("./ClientHandelshistorikk"),
  {
    ssr: false,
    loading: () => (
      <div
        className={`min-h-screen ${SURFACE.BG_LIGHT} flex items-center justify-center p-8`}
        role="status"
        aria-busy="true"
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600"
          aria-hidden
        />
      </div>
    ),
  },
);

export default function Page() {
  return <ClientHandelshistorikk />;
}
