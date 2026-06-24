"use client";

// TODO(marketing-shells): Migrate to @/shared/ui/marketing/CTASection for consistent CTA styling.
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { logCtaClick, FunnelStage } from "@/lib/analytics/marketing";
import { usePathname } from "next/navigation";

interface PrimaryCtaSectionProps {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "default" | "paper" | "pricing";
  locale?: string;
  trackingId?: string;
  experimentKey?: string;
  variantKey?: "A" | "B";
  funnelStage?: FunnelStage;
}

const variantStyles = {
  default: {
    section: "bg-blue-600",
    title: "text-white",
    description: "text-blue-100",
    primaryButton:
      "bg-white text-blue-600 hover:bg-blue-50 shadow-xl shadow-blue-900/20",
    secondaryButton: "border-2 border-white/30 text-white hover:bg-white/10",
    guarantee: "text-blue-200",
  },
  paper: {
    section: "bg-gradient-to-r from-emerald-600 to-teal-700",
    title: "text-white",
    description: "text-emerald-100",
    primaryButton:
      "bg-white text-emerald-700 hover:bg-emerald-50 shadow-xl shadow-emerald-900/20",
    secondaryButton: "border-2 border-white/30 text-white hover:bg-white/10",
    guarantee: "text-emerald-200",
  },
  pricing: {
    section: "bg-slate-900",
    title: "text-white",
    description: "text-slate-300",
    primaryButton:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-900/20",
    secondaryButton:
      "border-2 border-slate-600 text-slate-300 hover:bg-slate-800",
    guarantee: "text-slate-400",
  },
};

export function PrimaryCtaSection({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  variant = "default",
  locale = "no",
  trackingId,
  experimentKey,
  variantKey,
  funnelStage,
}: PrimaryCtaSectionProps) {
  const styles = variantStyles[variant];
  const pathname = usePathname();

  const handlePrimaryClick = async () => {
    if (trackingId) {
      await logCtaClick({
        trackingId,
        locale,
        variant,
        href: primaryHref,
        location: pathname,
        experimentKey,
        variantKey,
        funnelStage,
      });
    }
  };

  const handleSecondaryClick = async () => {
    if (trackingId && secondaryHref) {
      await logCtaClick({
        trackingId: `${trackingId}-secondary`,
        locale,
        variant,
        href: secondaryHref,
        location: pathname,
        experimentKey,
        variantKey,
        funnelStage,
      });
    }
  };

  return (
    <section className={`py-20 ${styles.section}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className={`text-3xl md:text-4xl font-bold ${styles.title} mb-4`}>
          {title}
        </h2>
        <p className={`text-lg md:text-xl ${styles.description} mb-8 max-w-2xl mx-auto`}>
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={hrefWithLocale(locale, primaryHref)}
            onClick={handlePrimaryClick}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all inline-flex items-center justify-center gap-2 ${styles.primaryButton}`}
          >
            {primaryLabel}
            <ArrowRight className="w-5 h-5" />
          </Link>

          {secondaryLabel && secondaryHref && (
            <Link
              href={hrefWithLocale(locale, secondaryHref)}
              onClick={handleSecondaryClick}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all inline-flex items-center justify-center ${styles.secondaryButton}`}
            >
              {secondaryLabel}
            </Link>
          )}
        </div>

        <p className={`text-sm mt-6 ${styles.guarantee}`}>
          {variant === "pricing"
            ? "30-dagers pengene-tilbake-garanti. Ingen spørsmål."
            : "Ingen kredittkort nødvendig. Avslutt når som helst."}
        </p>
      </div>
    </section>
  );
}
