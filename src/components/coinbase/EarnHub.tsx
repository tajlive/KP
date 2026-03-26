"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function EarnHub() {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");

  return (
    <div className="space-y-6 pb-16">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{t("earnTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("earnSubtitle")}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h2" className="text-lg font-semibold text-slate-900">
            {t("academy")}
          </Text>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {t("academyDesc")}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/kurs")}
            className="mt-4"
          >
            {t("openCourses")}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h2" className="text-lg font-semibold text-slate-900">
            {t("performanceCard")}
          </Text>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {t("performanceCardDesc")}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/resultater")}
            className="mt-4"
            variant="secondary"
          >
            {t("viewPerformance")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
