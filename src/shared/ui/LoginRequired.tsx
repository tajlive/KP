"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Lock } from "lucide-react";

interface LoginRequiredProps {
  next?: string;
}

export function LoginRequired({ next }: LoginRequiredProps) {
  const locale = useLocale();
  const loginUrl = next
    ? `/${locale}/login?next=${encodeURIComponent(next)}`
    : `/${locale}/login`;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Lock className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Logg inn for å fortsette
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Du må være innlogget for å se denne siden.
        </p>
        <Link
          href={loginUrl}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium transition-colors"
        >
          Logg inn
        </Link>
      </div>
    </div>
  );
}
