"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

interface TradePaginationProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  className?: string;
}

export function TradePagination({
  hasMore,
  isLoading,
  onLoadMore,
  className,
}: TradePaginationProps) {
  const t = useTranslations("trading");

  if (!hasMore && !isLoading) return null;

  return (
    <div className={cn("flex justify-center pt-2", className)} data-testid="trade-pagination">
      <Button
        variant="outline"
        size="sm"
        onClick={onLoadMore}
        disabled={isLoading || !hasMore}
        className="border-white/[0.08] text-white hover:bg-white/[0.05] min-w-[140px]"
        data-testid="trade-load-more"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            {t("cockpit.trades.loading")}
          </>
        ) : (
          t("cockpit.trades.loadMore")
        )}
      </Button>
    </div>
  );
}
