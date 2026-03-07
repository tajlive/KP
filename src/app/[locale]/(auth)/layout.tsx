import { AuthProvider } from "@/components/auth/AuthContext";
import { ClientSideProviders } from "@/components/providers/ClientSideProviders";
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
    <html
      lang={locale}
      className={`${dmSans.variable} ${instrumentSerif.variable}`}
    >
      <body
        className={`${dmSans.className} font-sans antialiased bg-white min-h-screen`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientSideProviders>
            <AuthProvider>
              <div className="min-h-screen flex flex-col">{children}</div>
            </AuthProvider>
          </ClientSideProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
