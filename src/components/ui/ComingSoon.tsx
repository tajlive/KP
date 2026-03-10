"use client";

import { useTranslations } from "next-intl";
import { Button } from "./button";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

interface ComingSoonProps {
  backHref?: string;
  backLabel?: string;
}

export function ComingSoon({ backHref = "/", backLabel }: ComingSoonProps) {
  const t = useTranslations("common");

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Construction className="w-10 h-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t("comingSoon.title")}
        </h1>

        <p className="text-slate-500 mb-8">{t("comingSoon.description")}</p>

        <Link href={backHref}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            {backLabel || t("back")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
