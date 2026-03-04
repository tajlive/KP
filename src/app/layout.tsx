import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    default: "Klarpakke Universitet - Norges første krypto-trading skole",
    template: "%s | Klarpakke",
  },
  description:
    "Lær krypto-trading fra A til Å. Fra Student til Master Trader på 4 uker. Paper trading med 1M kr virtuell kapital. 100% gratis å starte.",
  keywords: [
    "krypto",
    "trading",
    "kurs",
    "norge",
    "bitcoin",
    "læring",
    "paper trading",
    "simulator",
  ],
  authors: [{ name: "Klarpakke AS" }],
  creator: "Klarpakke AS",
  publisher: "Klarpakke AS",
  metadataBase: new URL("https://klarpakke.no"),
  alternates: {
    canonical: "/",
    languages: {
      no: "/no/",
      en: "/en/",
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.png",
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
    siteName: "Klarpakke Universitet",
    title: "Klarpakke Universitet - Norges første krypto-trading skole",
    description:
      "Lær krypto-trading fra A til Å. Fra Student til Master Trader på 4 uker. Paper trading med 1M kr virtuell kapital.",
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
    title: "Klarpakke Universitet - Norges første krypto-trading skole",
    description:
      "Lær krypto-trading fra A til Å. Fra Student til Master Trader på 4 uker.",
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
  verification: {
    google: "your-google-verification-code",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0052FF" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0B0D" },
  ],
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pass-through: [locale]/layout.tsx håndterer <html> og <body>
  return children;
}
