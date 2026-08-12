import type { Metadata, Viewport } from "next";
import "./globals.css";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: {
    default: "Klarpakke — AI-trading med lekepenger",
    template: "%s | Klarpakke",
  },
  description:
    "Lær kryptohandel med 100 000 kr i lekepenger — gratis beta, null risiko. Autonome AI-agenter på ekte markedsdata.",
  keywords: [
    "krypto",
    "trading",
    "kurs",
    "norge",
    "bitcoin",
    "læring",
    "lekepenger",
    "simulator",
  ],
  authors: [{ name: "Klarpakke Project" }],
  creator: "Klarpakke Project",
  publisher: "Klarpakke Project",
  metadataBase: new URL("https://www.klarpakke.no"),
  alternates: {
    canonical: "/",
    languages: {
      no: "/",
      en: "/en/",
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", sizes: "32x32", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/icons/icon.svg",
        color: "#0052FF",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: "no_NO",
    url: "https://klarpakke.no",
    siteName: "Klarpakke",
    title: "Klarpakke — AI-drevet trading for norske småsparere",
    description:
      "Gratis beta: Du får 100 000 kr i lekepenger (Pilot). Lær og test tradingstrategier med autonome AI-agenter — uten å risikere egne penger.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Klarpakke — AI-drevet trading for norske småsparere",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klarpakke — AI-drevet trading for norske småsparere",
    description:
      "Gratis beta: Du får 100 000 kr i lekepenger (Pilot). Lær og test tradingstrategier med autonome AI-agenter — uten å risikere egne penger.",
    images: ["/og-image.png"],
    creator: "@klarpakke",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Klarpakke",
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px)",
      },
    ],
  },
  category: "education",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0A0B0D" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0B0D" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Root layout er bare en passthrough til [locale]/layout.tsx
  // HTML-struktur (html, head, body) defineres i [locale]/layout.tsx
  // Sentry trace injection deaktivert via server config
  return children;
}
