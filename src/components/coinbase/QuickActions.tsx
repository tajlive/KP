"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@coinbase/cds-web/buttons";
import { HStack } from "@coinbase/cds-web/layout";
import { ArrowRightLeft, CircleDollarSign, SendHorizontal } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function QuickActions() {
  const locale = useLocale();
  const t = useTranslations("dashboard.coinbase");

  return (
    <HStack className="w-full flex-wrap gap-2 [&>a]:min-w-0 [&>a]:flex-1 [&>a]:sm:flex-none sm:[&>a]:flex-initial">
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="primary"
        start={<CircleDollarSign className="h-4 w-4" />}
      >
        {t("buy")}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="secondary"
        start={<ArrowRightLeft className="h-4 w-4" />}
      >
        {t("sell")}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/portfolio")}
        variant="secondary"
        start={<SendHorizontal className="h-4 w-4" />}
      >
        {t("send")}
      </Button>
    </HStack>
  );
}
