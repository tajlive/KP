"use client";

import Link from "next/link";
import { Button } from "@coinbase/cds-web/buttons";
import { HStack } from "@coinbase/cds-web/layout";
import { ArrowRightLeft, CircleDollarSign, SendHorizontal } from "lucide-react";
import { hrefWithLocale } from "@/i18n/href-with-locale";

export function QuickActions({ locale }: { locale: string }) {
  return (
    <HStack className="flex-wrap gap-2">
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="primary"
        start={<CircleDollarSign className="h-4 w-4" />}
      >
        {locale === "no" ? "Kjøp" : "Buy"}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/trade")}
        variant="secondary"
        start={<ArrowRightLeft className="h-4 w-4" />}
      >
        {locale === "no" ? "Selg" : "Sell"}
      </Button>
      <Button
        as={Link}
        href={hrefWithLocale(locale, "/dashboard/portfolio")}
        variant="secondary"
        start={<SendHorizontal className="h-4 w-4" />}
      >
        {locale === "no" ? "Send" : "Send"}
      </Button>
    </HStack>
  );
}
