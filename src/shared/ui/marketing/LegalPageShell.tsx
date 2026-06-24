import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { type Metadata } from "next";
import { type ReactNode } from "react";

export type LegalNamespace = "legal" | "legal.terms" | "legal.privacy" | "legal.cookies";

export interface LegalPageShellProps {
  children: ReactNode;
  className?: string;
}

export function LegalPageShell({
  children,
  className,
}: LegalPageShellProps) {
  return (
    <main
      className={cn(
        "min-h-screen bg-white py-16 pt-20 text-foreground",
        className
      )}
    >
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

export interface LegalMetadataOptions {
  locale: string;
  namespace: LegalNamespace;
  titleKey: string;
  descriptionKey: string;
  pathname?: string;
}

export async function generateLegalMetadata({
  locale,
  namespace,
  titleKey,
  descriptionKey,
  pathname = "",
}: LegalMetadataOptions): Promise<Metadata> {
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
    },
  };
}

export default LegalPageShell;
