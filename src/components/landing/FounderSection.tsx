import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * FounderSection — FOUNDER-LOVEN: de 100 første får gratis tilgang for livet
 * + 5000 KLT. Gjelder ALL copy (mega-plan Del 1).
 */
export default function FounderSection() {
  const t = useTranslations("landing.bevis.founder");
  const locale = useLocale();

  return (
    <section className="bg-kp-bg-primary py-12 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-3xl border border-kp-border bg-[linear-gradient(135deg,rgba(0,82,255,0.18),rgba(34,197,94,0.12))] p-8 text-center sm:p-12">
          <h2 className="text-heading-sm font-black text-kp-text-primary sm:text-heading">
            {t("title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-kp-text-secondary">
            {t("subtitle")}
          </p>
          <div className="mt-8">
            <Link
              href={`/${locale}/register`}
              className="inline-flex min-h-[64px] items-center justify-center rounded-2xl bg-green-500 px-12 py-5 text-xl font-extrabold text-[#06280f] shadow-lg shadow-green-500/25 transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02] hover:bg-green-600 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
            >
              {t("cta")} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
