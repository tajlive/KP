"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, GraduationCap, Info, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface KLTRewardCardProps {
  balance?: number;
  studentNumber?: number;
}

export function KLTRewardCard({
  balance = 0,
  studentNumber,
}: KLTRewardCardProps) {
  const t = useTranslations("dashboard.klt");

  return (
    <Card className="bg-gradient-to-br from-[#171923] to-[#1a1c2e] border-[#2A2D3A] overflow-hidden relative group">
      {/* Decorative background elements */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-[#0052FF]/10 rounded-full blur-3xl group-hover:bg-[#0052FF]/20 transition-all duration-500" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-500" />
            {t("title")}
          </CardTitle>
          {studentNumber && (
            <span className="px-2 py-1 bg-[#0052FF]/20 text-[#6FA3FF] text-[10px] font-bold rounded-full uppercase tracking-wider border border-[#0052FF]/30">
              {t("founderNumber", { number: studentNumber })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="bg-[#0F1118]/50 rounded-xl p-4 border border-[#2A2D3A]">
          <p className="text-white/40 text-xs mb-1 uppercase tracking-widest font-bold">
            {t("yourBalance")}
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-white leading-none">
              {balance.toLocaleString("no-NO")}
            </span>
            <span className="text-[#6FA3FF] font-bold text-sm mb-1 underline decoration-[#0052FF]/50 underline-offset-4">
              KLT
            </span>
          </div>
        </div>

        {/* Why KLT is awesome */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t("founderBenefits.title")}
              </p>
              <p className="text-xs text-white/40">
                {t("founderBenefits.desc")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t("learnEarn.title")}
              </p>
              <p className="text-xs text-white/40">{t("learnEarn.desc")}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t("futureValue.title")}
              </p>
              <p className="text-xs text-white/40">{t("futureValue.desc")}</p>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full text-xs text-[#6FA3FF] hover:text-white hover:bg-[#0052FF]/10 gap-2"
          >
            <Info className="w-3 h-3" />
            {t("readMore")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
