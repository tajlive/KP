"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Rocket, Sparkles } from "lucide-react";

export function EmptyBotState() {
  const t = useTranslations("dashboard.botStatus");
  const router = useRouter();

  const handleStartPaperTrading = () => {
    router.push("/paper-trading");
  };

  return (
    <Card className="mb-6 border-dashed border-slate-300 dark:border-slate-700">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Icon */}
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-slate-400" />
          </div>

          {/* Content */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {t("noBot")}
              </h3>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t("noBotDescription")}
            </p>
            <Button 
              onClick={handleStartPaperTrading}
              className="gap-2"
            >
              <Rocket className="w-4 h-4" />
              {t("startPaperTrading")}
            </Button>
          </div>

          {/* Decorative stats - placeholder */}
          <div className="hidden sm:flex gap-6 text-center">
            <div>
              <p className="text-xs text-slate-500">{t("whatToExpect")}</p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("feature1")}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500"> </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("feature2")}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500"> </p>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("feature3")}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
