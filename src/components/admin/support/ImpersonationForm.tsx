"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Loader2 } from "lucide-react";

interface ImpersonationFormProps {
  initialEmail?: string;
  redirectPath?: string;
}

export default function ImpersonationForm({
  initialEmail = "",
  redirectPath = "/no/handel",
}: ImpersonationFormProps) {
  const t = useTranslations("admin.impersonation");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [durationMin, setDurationMin] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/support/impersonate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          reason: reason.trim(),
          durationMin,
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        code?: string;
        expiresAt?: string;
      };

      if (!res.ok || body.ok !== true) {
        setError(
          body.error || t("startError", { status: String(res.status) }),
        );
        return;
      }

      window.open(redirectPath, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(t("startError", { status: err instanceof Error ? err.message : "network" }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="impersonate-email" className="text-sm text-slate-300">
          {t("email")}
        </label>
        <input
          id="impersonate-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#0052FF]"
          placeholder={t("emailPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="impersonate-password" className="text-sm text-slate-300">
          {t("password")}
        </label>
        <input
          id="impersonate-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#0052FF]"
          placeholder={t("passwordPlaceholder")}
        />
        <p className="text-xs text-slate-500">{t("passwordHint")}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="impersonate-reason" className="text-sm text-slate-300">
          {t("reason")}
        </label>
        <input
          id="impersonate-reason"
          type="text"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#0052FF]"
          placeholder={t("reasonPlaceholder")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="impersonate-duration" className="text-sm text-slate-300">
          {t("duration", { minutes: durationMin })}
        </label>
        <input
          id="impersonate-duration"
          type="range"
          min={5}
          max={60}
          step={5}
          required
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-full accent-[#0052FF]"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{t("minDuration", { minutes: 5 })}</span>
          <span>{t("maxDuration", { minutes: 60 })}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password || !reason}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0052FF] text-white rounded-lg font-medium hover:bg-[#0052FF]/90 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
        {loading ? t("starting") : t("start")}
      </button>
    </form>
  );
}
