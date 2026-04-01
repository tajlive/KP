"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, type Resolver } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import {
  defaultStrategyMetadataValues,
  strategyMetadataSchema,
  type StrategyMetadataFormValues,
} from "@/lib/strategy-form-gen";

export interface StrategyMetadataFormProps {
  readonly initialValues?: Partial<StrategyMetadataFormValues>;
  readonly onSubmit: (
    values: StrategyMetadataFormValues,
  ) => void | Promise<void>;
  readonly submitLabelKey?: "submit" | "saveDraft";
  readonly className?: string;
}

export function StrategyMetadataForm({
  initialValues,
  onSubmit,
  submitLabelKey = "submit",
  className,
}: StrategyMetadataFormProps) {
  const t = useTranslations("strategyMarketplace.metadata");

  const form = useForm<StrategyMetadataFormValues>({
    resolver: zodResolver(
      strategyMetadataSchema,
    ) as Resolver<StrategyMetadataFormValues>,
    defaultValues: defaultStrategyMetadataValues(initialValues),
    mode: "onBlur",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = form;

  const priceModel = watch("priceModel");

  return (
    <form className={className} onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-6 max-w-lg">
        <div className="space-y-2">
          <Label
            htmlFor="strategy-metadata-title"
            className="min-h-[44px] flex items-center"
          >
            {t("title")}
          </Label>
          <Input
            id="strategy-metadata-title"
            {...register("title")}
            placeholder={t("titlePlaceholder")}
            className="min-h-11 touch-manipulation"
            autoComplete="off"
            aria-invalid={errors.title ? "true" : "false"}
            aria-describedby={
              errors.title ? "strategy-metadata-title-err" : undefined
            }
          />
          {errors.title?.message ? (
            <p
              id="strategy-metadata-title-err"
              className="text-sm text-destructive"
              role="alert"
            >
              {t(errors.title.message)}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="strategy-metadata-desc"
            className="min-h-[44px] flex items-center"
          >
            {t("description")}
          </Label>
          <Textarea
            id="strategy-metadata-desc"
            {...register("description")}
            placeholder={t("descriptionPlaceholder")}
            rows={4}
            className="min-h-[120px] touch-manipulation resize-y"
            aria-invalid={errors.description ? "true" : "false"}
            aria-describedby={
              errors.description ? "strategy-metadata-desc-err" : undefined
            }
          />
          {errors.description?.message ? (
            <p
              id="strategy-metadata-desc-err"
              className="text-sm text-destructive"
              role="alert"
            >
              {t(errors.description.message)}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="min-h-[44px] flex items-center">
              {t("category")}
            </Label>
            <Select
              value={watch("category")}
              onValueChange={(v) =>
                setValue(
                  "category",
                  v as StrategyMetadataFormValues["category"],
                  {
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger
                className="min-h-11 touch-manipulation"
                aria-label={t("category")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dca">{t("category_dca")}</SelectItem>
                <SelectItem value="trend">{t("category_trend")}</SelectItem>
                <SelectItem value="grid">{t("category_grid")}</SelectItem>
                <SelectItem value="ai_signal">{t("category_ai")}</SelectItem>
                <SelectItem value="other">{t("category_other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="min-h-[44px] flex items-center">
              {t("riskLevel")}
            </Label>
            <Select
              value={watch("riskLevel")}
              onValueChange={(v) =>
                setValue(
                  "riskLevel",
                  v as StrategyMetadataFormValues["riskLevel"],
                  {
                    shouldValidate: true,
                  },
                )
              }
            >
              <SelectTrigger
                className="min-h-11 touch-manipulation"
                aria-label={t("riskLevel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("risk_low")}</SelectItem>
                <SelectItem value="medium">{t("risk_medium")}</SelectItem>
                <SelectItem value="high">{t("risk_high")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="min-h-[44px] flex items-center">
            {t("priceModel")}
          </Label>
          <Select
            value={priceModel}
            onValueChange={(v) =>
              setValue(
                "priceModel",
                v as StrategyMetadataFormValues["priceModel"],
                {
                  shouldValidate: true,
                },
              )
            }
          >
            <SelectTrigger
              className="min-h-11 touch-manipulation"
              aria-label={t("priceModel")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">{t("priceModel_free")}</SelectItem>
              <SelectItem value="subscription">
                {t("priceModel_subscription")}
              </SelectItem>
              <SelectItem value="one_time">
                {t("priceModel_one_time")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="strategy-metadata-price"
            className="min-h-[44px] flex items-center"
          >
            {t("priceNok")}
          </Label>
          <Input
            id="strategy-metadata-price"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            disabled={priceModel === "free"}
            className="min-h-11 touch-manipulation"
            {...register("priceNok", { valueAsNumber: true })}
            aria-invalid={errors.priceNok ? "true" : "false"}
            aria-describedby={
              errors.priceNok ? "strategy-metadata-price-err" : undefined
            }
          />
          {errors.priceNok?.message ? (
            <p
              id="strategy-metadata-price-err"
              className="text-sm text-destructive"
              role="alert"
            >
              {t(errors.priceNok.message)}
            </p>
          ) : null}
        </div>

        <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2">
          <Label htmlFor="strategy-metadata-public" className="cursor-pointer">
            {t("isPublic")}
          </Label>
          <Switch
            id="strategy-metadata-public"
            checked={watch("isPublic")}
            onCheckedChange={(c) =>
              setValue("isPublic", c, { shouldValidate: true })
            }
            className="min-h-11 min-w-11"
          />
        </div>

        <Button
          type="submit"
          className="min-h-11 w-full touch-manipulation sm:w-auto"
          disabled={isSubmitting}
        >
          {t(submitLabelKey)}
        </Button>
      </div>
    </form>
  );
}
