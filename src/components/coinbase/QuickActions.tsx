"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@coinbase/cds-web/buttons";
import { ArrowRightLeft, CircleDollarSign, SendHorizontal } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

/** Min 44×44 touch (chief architect / WCAG) — ikke bruk [&>a] mot CDS; eksplisitt grid + className. */
const actionClass =
  "min-h-11 w-full justify-center touch-manipulation sm:w-auto sm:min-w-0";

export function QuickActions() {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");

  return (
    <div
      className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap"
      role="group"
      aria-label={t("quickActionsGroupAria")}
    >
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="primary"
        className={actionClass}
        start={<CircleDollarSign className="h-4 w-4 shrink-0" />}
      >
        {t("buy")}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="secondary"
        className={actionClass}
        start={<ArrowRightLeft className="h-4 w-4 shrink-0" />}
      >
        {t("sell")}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/portfolio")}
        variant="secondary"
        className={`col-span-2 ${actionClass} sm:col-span-1`}
        start={<SendHorizontal className="h-4 w-4 shrink-0" />}
      >
        {t("send")}
      </Button>
    </div>
  );
}
