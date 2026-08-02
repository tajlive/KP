"use client";

import { AdvancedAnalyticsSection } from "@/features/dashboard/AdvancedAnalyticsSection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "next-intl";

export default function AnalysisPage() {
  const locale = useLocale();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <Link
        href={`/${locale}/dashboard`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Tilbake til dashboard
      </Link>
      <AdvancedAnalyticsSection defaultExpanded />
    </div>
  );
}
