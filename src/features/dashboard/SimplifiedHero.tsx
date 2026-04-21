"use client";

import { BRAND } from "@/lib/design/tokens";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { useLocale } from "next-intl";

interface Props {
  balance: number;
  changePct: number;
  ctaText?: string;
  ctaLink?: string;
}

export function SimplifiedHero({ balance, changePct, ctaText, ctaLink }: Props) {
  const locale = useLocale();

  return (
    <div className="py-10 md:py-16 text-center">
      <div className="text-5xl md:text-6xl font-bold text-white">
        {balance.toLocaleString("no-NO")} NOK
      </div>
      <div
        className={`text-lg mt-2 ${
          changePct >= 0 ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {changePct > 0 ? "+" : ""}
        {changePct.toFixed(2)}%
      </div>
      <Link href={ctaLink ?? `/${locale}/dashboard/trade?mode=paper`}>
        <Button
          asChild
          className={`${BRAND.gradient} mt-6 px-8 py-6 text-lg font-semibold rounded-xl`}
        >
          <span>{ctaText ?? "Start trading"}</span>
        </Button>
      </Link>
    </div>
  );
}
