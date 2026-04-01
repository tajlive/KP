"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  copyStrategyRequestSchema,
  type CopyStrategyRequest,
} from "@/lib/strategies/copy-strategy-schema";
import { cn, createClient } from "@/lib/utils";

export { copyStrategyRequestSchema, type CopyStrategyRequest };

export interface CopyStrategyFormProps {
  /** Marketplace listing-ID (UUID) — samme som `[id]` i API-ruten */
  readonly strategyId: string;
  readonly className?: string;
  readonly onSuccess?: (result: { sessionId: string }) => void;
}

export function CopyStrategyForm({
  strategyId,
  className,
  onSuccess,
}: CopyStrategyFormProps) {
  const t = useTranslations("copyStrategy");
  const supabase = useMemo(() => createClient(), []);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CopyStrategyRequest>({
    resolver: zodResolver(
      copyStrategyRequestSchema,
    ) as Resolver<CopyStrategyRequest>,
    defaultValues: {
      capitalAllocationNok: 5000,
      riskLevel: "balanced",
      autoStopLoss: false,
      stopLossPercent: 5,
    },
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const autoStopLoss = watch("autoStopLoss");

  const onSubmit = async (values: CopyStrategyRequest) => {
    setSubmitting(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        toast.error(t("errorNotSignedIn"));
        return;
      }

      const res = await fetch(
        `/api/strategies/${encodeURIComponent(strategyId)}/copy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capitalAllocationNok: values.capitalAllocationNok,
            riskLevel: values.riskLevel,
            autoStopLoss: values.autoStopLoss,
            stopLossPercent: values.autoStopLoss
              ? values.stopLossPercent
              : null,
          }),
          credentials: "include",
        },
      );

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : t("errorGeneric");
        toast.error(errMsg);
        return;
      }

      const sessionId =
        typeof json === "object" &&
        json !== null &&
        "sessionId" in json &&
        typeof (json as { sessionId: unknown }).sessionId === "string"
          ? (json as { sessionId: string }).sessionId
          : "";

      toast.success(t("successToast"));
      onSuccess?.({ sessionId });
    } catch {
      toast.error(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn("flex w-full max-w-md flex-col gap-5", className)}
      noValidate
    >
      <input type="hidden" name="strategyId" value={strategyId} readOnly />

      <div className="space-y-2">
        <Label
          htmlFor="copy-capital"
          className="flex min-h-11 items-center text-sm font-medium"
        >
          {t("capitalLabel")}
        </Label>
        <Input
          id="copy-capital"
          type="number"
          inputMode="numeric"
          min={1000}
          max={50000}
          step={100}
          className="min-h-11 touch-manipulation"
          aria-invalid={errors.capitalAllocationNok ? "true" : "false"}
          aria-describedby={
            errors.capitalAllocationNok ? "copy-capital-err" : undefined
          }
          {...register("capitalAllocationNok", { valueAsNumber: true })}
        />
        {errors.capitalAllocationNok?.message ? (
          <p
            id="copy-capital-err"
            className="text-destructive text-sm"
            role="alert"
          >
            {t(errors.capitalAllocationNok.message)}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label className="flex min-h-11 items-center text-sm font-medium">
          {t("riskLabel")}
        </Label>
        <Select
          value={watch("riskLevel")}
          onValueChange={(v) =>
            setValue("riskLevel", v as CopyStrategyRequest["riskLevel"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger
            className="min-h-11 touch-manipulation"
            aria-label={t("riskLabel")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conservative">
              {t("riskConservative")}
            </SelectItem>
            <SelectItem value="balanced">{t("riskBalanced")}</SelectItem>
            <SelectItem value="aggressive">{t("riskAggressive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-11 flex-row items-center gap-3 rounded-lg border border-border/60 px-3 py-2">
        <Checkbox
          id="copy-autostop"
          checked={autoStopLoss}
          onCheckedChange={(c) =>
            setValue("autoStopLoss", c === true, { shouldValidate: true })
          }
          className="size-11 min-h-11 min-w-11 shrink-0 touch-manipulation"
        />
        <Label
          htmlFor="copy-autostop"
          className="cursor-pointer text-sm font-medium leading-snug"
        >
          {t("autoStopLossLabel")}
        </Label>
      </div>

      {autoStopLoss ? (
        <div className="space-y-2">
          <Label
            htmlFor="copy-sl-pct"
            className="flex min-h-11 items-center text-sm font-medium"
          >
            {t("stopLossPercentLabel")}
          </Label>
          <Input
            id="copy-sl-pct"
            type="number"
            inputMode="decimal"
            min={1}
            max={50}
            step={0.5}
            className="min-h-11 touch-manipulation"
            aria-invalid={errors.stopLossPercent ? "true" : "false"}
            aria-describedby={
              errors.stopLossPercent ? "copy-sl-err" : undefined
            }
            {...register("stopLossPercent", { valueAsNumber: true })}
          />
          {errors.stopLossPercent?.message ? (
            <p
              id="copy-sl-err"
              className="text-destructive text-sm"
              role="alert"
            >
              {t(errors.stopLossPercent.message)}
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className="min-h-11 w-full touch-manipulation sm:w-auto"
        disabled={submitting}
      >
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
