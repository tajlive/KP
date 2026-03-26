"use client";

import Link from "next/link";
import { Card } from "@coinbase/cds-web/cards";
import { Text } from "@coinbase/cds-web/typography";
import { Button } from "@coinbase/cds-web/buttons";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function EarnHub({ locale }: { locale: string }) {
  return (
    <div className="space-y-6 pb-16">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">
          {locale === "no" ? "Læring" : "Learn"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {locale === "no"
            ? "Mikrolæring, strategier og progresjon."
            : "Micro learning, strategies and progress."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h2" className="text-lg font-semibold text-slate-900">
            {locale === "no" ? "Akademi" : "Academy"}
          </Text>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {locale === "no"
              ? "Fortsett kursløpet og lær mer om risiko og strategi."
              : "Continue your course journey and improve strategy understanding."}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/kurs")}
            className="mt-4"
          >
            {locale === "no" ? "Åpne kurs" : "Open courses"}
          </Button>
        </Card>

        <Card className="border border-slate-200 bg-white p-6">
          <Text as="h2" className="text-lg font-semibold text-slate-900">
            {locale === "no" ? "Resultater" : "Performance"}
          </Text>
          <Text as="p" className="mt-2 text-sm text-slate-600">
            {locale === "no"
              ? "Se historikk og resultater på tvers av sessioner."
              : "Review history and performance across sessions."}
          </Text>
          <Button
            as={Link}
            href={hrefWithLocale(locale, "/dashboard/resultater")}
            className="mt-4"
            variant="secondary"
          >
            {locale === "no" ? "Se resultater" : "View performance"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
