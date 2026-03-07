import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import KursModulClient from "./KursModulClient";

// 8 Course modules for metadata generation
const modules = [
  { slug: "hva-er-krypto", title: "Hva er kryptovaluta?" },
  { slug: "lommeboker", title: "Lommebøker og sikkerhet" },
  { slug: "kjop-din-forste", title: "Kjøp din første krypto" },
  { slug: "autotrading", title: "Hva er autotrading?" },
  { slug: "risiko-psykologi", title: "Risiko og psykologi" },
  { slug: "lese-en-graf", title: "Lese en graf" },
  { slug: "din-forste-bot", title: "Din første bot" },
  { slug: "fra-papir-til-ekte", title: "Fra papir til ekte" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const module = modules.find(m => m.slug === slug);
  
  if (!module) {
    return {
      title: "Kurs ikke funnet - Klarpakke",
    };
  }

  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: `${module.title} - ${t("courses.title")}`,
    description: t("courses.description"),
  };
}

export async function generateStaticParams() {
  const locales = ["no", "en", "th", "zh"];
  const params = [];
  
  for (const locale of locales) {
    for (const module of modules) {
      params.push({ locale, slug: module.slug });
    }
  }
  
  return params;
}

export default async function KursModulPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  
  const moduleExists = modules.some(m => m.slug === slug);
  if (!moduleExists) {
    notFound();
  }

  return <KursModulClient slug={slug} />;
}
