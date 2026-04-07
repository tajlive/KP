"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { BRAND } from "@/lib/design/tokens";
import { Button } from "@/shared/ui/button";
import { Card } from "@coinbase/cds-web/cards";
import { Sparkles } from "lucide-react";

const HAS_TRADED_KEY = "kp_has_traded";

export function FirstTradePrompt() {
  const [hasTraded, setHasTraded] = useState<boolean | null>(null);
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    // Check localStorage on mount
    const traded = localStorage.getItem(HAS_TRADED_KEY);
    setHasTraded(traded === "true");
  }, []);

  const handleClick = () => {
    localStorage.setItem(HAS_TRADED_KEY, "true");
    setHasTraded(true);
    router.push(`/${locale}/dashboard/trade?mode=paper`);
  };

  // Don't render until we've checked localStorage (to avoid hydration mismatch)
  if (hasTraded === null || hasTraded) {
    return null;
  }

  return (
    <Card className="border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-brand-600/5 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-full">
            <Sparkles className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-white font-semibold">
              Gjør din første handel og få 100 KLT
            </p>
            <p className="text-sm text-gray-400">
              Start med lekepenger - helt risikofritt
            </p>
          </div>
        </div>
        <Button
          onClick={handleClick}
          className={`${BRAND.gradient} px-6 py-3 font-semibold rounded-xl whitespace-nowrap`}
        >
          Prøv lekepenger
        </Button>
      </div>
    </Card>
  );
}
