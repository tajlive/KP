import { AuthProvider } from "@/features/auth/AuthContext";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../../globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const dynamic = "force-dynamic";

interface AuthLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AuthLayout({
  children,
  params,
}: AuthLayoutProps) {
  const { locale } = await params;
  let messages;

  try {
    messages = await getMessages();
  } catch {
    messages = await import(`../../../../messages/en.json`).then((m) => m.default);
  }

  return (
    <div 
      className={`${dmSans.variable} ${instrumentSerif.variable} ${dmSans.className} font-sans antialiased bg-white min-h-screen`}
      suppressHydrationWarning
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        {/* NOTE: ClientSideProviders intentionally NOT used here.
            It contains ChatWidget which should only mount once in root layout.
            Auth pages don't need the global widgets (chat, PWA prompt). */}
        <AuthProvider>
          <div className="min-h-screen flex flex-col" suppressHydrationWarning>{children}</div>
        </AuthProvider>
      </NextIntlClientProvider>
    </div>
  );
}
