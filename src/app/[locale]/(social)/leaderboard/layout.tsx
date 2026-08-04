import { ToastProvider } from "@/providers/ToastProvider";
import { TopNav } from "@/shared/navigation/TopNav";

export const runtime = "nodejs";

/**
 * Leaderboard-layout — app-chrome med innlogget header (TopNav + avatar-meny),
 * samme header som /dashboard løser innlogget tilstand med.
 *
 * Krever at `/leaderboard` ligger i APP_SHELL_PATHS (src/lib/navigation/config.ts):
 * - RootProviders monterer da AuthProvider rundt siden (marketing-stier har
 *   ingen AuthProvider → NavAuthState i marketing-headeren viste «Logg inn /
 *   Start gratis» for innloggede brukere).
 * - MarketingShellLayout skjuler marketing-nav + footer (unngår dobbelt header).
 *
 * AuthProvider leveres av RootProviders — denne layouten trenger kun chrome + Toaster.
 */
export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="relative flex min-h-screen flex-col bg-slate-950">
        <TopNav />
        <main className="flex-1">{children}</main>
      </div>
    </ToastProvider>
  );
}
