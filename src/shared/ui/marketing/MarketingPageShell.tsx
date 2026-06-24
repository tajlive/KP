import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { type Metadata } from "next";
import { type ReactNode } from "react";

export type MarketingNamespace =
  | "landing"
  | "pricing"
  | "about"
  | "contact"
  | "calculator"
  | "help"
  | "binanceGuide"
  | "metadata";

export interface MarketingPageShellProps {
  children: ReactNode;
  className?: string;
}

export function MarketingPageShell({
  children,
  className = "bg-background",
}: MarketingPageShellProps) {
  return (
    <main className={cn("min-h-screen", className)}>
      {children}
    </main>
  );
}

export interface MarketingMetadataOptions {
  locale: string;
  namespace: MarketingNamespace;
  titleKey: string;
  descriptionKey: string;
  ogImage?: string;
  pathname?: string;
}

export async function generateMarketingMetadata({
  locale,
  namespace,
  titleKey,
  descriptionKey,
  ogImage = "/og-image.png",
  pathname = "",
}: MarketingMetadataOptions): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace });
  const title = t(titleKey);
  const description = t(descriptionKey);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://www.klarpakke.no/${locale}${pathname}`,
      images: [
        { url: ogImage, width: 1200, height: 630, alt: "Klarpakke" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default MarketingPageShell;
