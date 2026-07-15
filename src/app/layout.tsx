import type { Metadata, Viewport } from "next";
import "./globals.css";

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: {
    default: "Klarpakke — Norges krypto-skole",
    template: "%s | Norges krypto-skole",
  },
  description:
    "Norges første krypto-skole. Lær kryptovaluta og trading med lekepenger. AI-drevne verktøy, trygg læring — fra nybegynner til trader på 4 uker.",
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
  authors: [{ name: "Klarpakke AS" }],
  creator: "Klarpakke AS",
  publisher: "Klarpakke AS",
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
    siteName: "Klarpakke — Norges krypto-skole",
    title: "Klarpakke — Norges krypto-skole",
    description:
      "Norges første krypto-skole. Lær kryptovaluta og trading med lekepenger. AI-drevne verktøy, trygg læring fra nybegynner til trader.",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 682,
        alt: "Klarpakke Universitet Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Klarpakke — Norges krypto-skole",
    description:
      "Norges første krypto-skole. Lær kryptovaluta og trading med lekepenger. AI-drevne verktøy, trygg læring fra nybegynner til trader.",
    images: ["/logo.svg"],
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
