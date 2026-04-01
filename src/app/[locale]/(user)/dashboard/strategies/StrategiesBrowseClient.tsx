"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createClient } from "@/lib/utils";
import type { Database } from "@/types/database.types";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { StrategyMetadataForm } from "@/features/marketplace/strategy-marketplace/StrategyMetadataForm";
import type { StrategyMetadataFormValues } from "@/lib/strategy-form-gen";
import { toast } from "sonner";

export type StrategyBrowseRow =
  Database["public"]["Tables"]["strategies"]["Row"];

function normalizeStrategiesPayload(
  data: StrategyBrowseRow[] | null,
): StrategyBrowseRow[] {
  if (data === null || data === undefined) {
    return [];
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Rotårsak til `strategies.map is not undefined`:
 * - `setStrategies(api.strategies)` når JSON mangler felt → `undefined`.
 * - `setStrategies(queryResult)` uten coalescing når klienten antar array.
 * All rendering går via `safeList` (alltid array).
 */
export default function StrategiesBrowseClient({
  locale,
}: {
  readonly locale: string;
}) {
  const t = useTranslations("strategyMarketplace.browse");
  const supabase = useMemo(() => createClient(), []);

  const [strategies, setStrategies] = useState<StrategyBrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchStrategies = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
        setStrategies([]);
        return;
      }

      setStrategies(
        normalizeStrategiesPayload(data as StrategyBrowseRow[] | null),
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      setLoadError(msg);
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchStrategies();
  }, [fetchStrategies]);

  const safeList = normalizeStrategiesPayload(strategies);

  const onMetadataDemo = async (values: StrategyMetadataFormValues) => {
    toast.success(t("demoSaved", { title: values.title }));
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      {loadError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-destructive text-sm" role="alert">
              {t("loadError")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 touch-manipulation"
              onClick={() => void fetchStrategies()}
            >
              {t("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("listHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("loading")}
            </p>
          ) : safeList.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t("empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {safeList.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 rounded-lg border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {s.strategy_type ?? "—"} · {s.risk_level ?? "—"}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="min-h-11 touch-manipulation self-start sm:self-center"
                  >
                    <Link href={`/${locale}/dashboard/auto-trade`}>
                      {t("openAutoTrade")}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("metadataSectionTitle")}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {t("metadataSectionHint")}
          </p>
        </CardHeader>
        <CardContent>
          <StrategyMetadataForm onSubmit={onMetadataDemo} />
        </CardContent>
      </Card>
    </div>
  );
}
