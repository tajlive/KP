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
      "no": "/",
      "en": "/en/",
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
  return (
    <>
      <head suppressHydrationWarning>
        {/* KRITISK: Rens korrupt Supabase auth-token FØR gotrue-js kjøres.
            Inline synkront script — kjøres før React, før Supabase, garantert. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var PROJECT = 'vuxbjlykgmzskxbclquf';
    var keys = Object.keys(localStorage);
    var toDelete = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      // Slett alle sb-* nøkler (alle varianter gotrue-js bruker)
      if (k.indexOf('sb-') === 0) {
        var v = localStorage.getItem(k);
        if (v === null) continue;
        var corrupt = false;
        // 1. UTF-8 validering
        try {
          new TextDecoder('utf-8',{fatal:true}).decode(
            new TextEncoder().encode(v)
          );
        } catch(e) { corrupt = true; }
        // 2. JSON validering (gotrue tokens er alltid JSON)
        if (!corrupt && v.charAt(0) === '{') {
          try { JSON.parse(v); } catch(e) { corrupt = true; }
        }
        if (corrupt) {
          toDelete.push(k);
          console.warn('[Klarpakke] Sletter korrupt token:', k);
        }
      }
    }
    // Slett alle korrupte + slett ALLTID custom storageKey-varianter
    // fra gammel config (072a15dc8) som forstyrrer ny default nøkkel
    var legacyKeys = [
      'sb-' + PROJECT + '-auth-token',
      'sb-' + PROJECT + '-auth-token-code-verifier',
      'sb-' + PROJECT + '-auth-token-provider-token',
    ];
    for (var j = 0; j < legacyKeys.length; j++) {
      if (toDelete.indexOf(legacyKeys[j]) === -1) {
        var lv = localStorage.getItem(legacyKeys[j]);
        if (lv !== null) {
          // Sjekk om denne er korrupt
          var lc = false;
          try {
            new TextDecoder('utf-8',{fatal:true}).decode(
              new TextEncoder().encode(lv)
            );
          } catch(e) { lc = true; }
          if (lc) toDelete.push(legacyKeys[j]);
        }
      }
    }
    for (var d = 0; d < toDelete.length; d++) {
      localStorage.removeItem(toDelete[d]);
    }
    if (toDelete.length > 0) {
      console.warn('[Klarpakke] Rensede', toDelete.length, 'korrupte tokens');
    }
  } catch(e) {}
})();`,
          }}
        />
      </head>
      {children}
    </>
  );
}
