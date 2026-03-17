"use client";

import { useTranslations } from "next-intl";
import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailCapture() {
  const t = useTranslations("landing.emailCapture");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <section className="py-20 bg-slate-950">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-10">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                <path d="m9 11 3 3L22 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{t("successTitle")}</h3>
            <p className="text-slate-400">{t("successDesc")}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0052FF]/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#0052FF]/10 border border-[#0052FF]/20 rounded-full text-sm text-blue-300 font-medium mb-6">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          {t("badge")}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
          {t("title")}
        </h2>
        <p className="text-slate-400 text-lg mb-8 max-w-lg mx-auto">
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className={`w-full px-5 py-4 bg-white/5 border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/50 focus:border-[#0052FF]/50 transition-colors ${
                status === "error"
                  ? "border-red-500/50"
                  : "border-white/10"
              }`}
            />
            {status === "error" && (
              <p className="absolute -bottom-6 left-0 text-xs text-red-400">
                {t("errorMsg")}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="px-8 py-4 bg-[#0052FF] hover:bg-[#0041CC] text-white font-bold rounded-xl shadow-lg shadow-[#0052FF]/20 hover:shadow-[#0052FF]/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("loading")}
              </span>
            ) : (
              t("cta")
            )}
          </button>
        </form>

        <p className="text-xs text-slate-600 mt-8">
          {t("privacy")}
        </p>
      </div>
    </section>
  );
}
