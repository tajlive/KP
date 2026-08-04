"use client";

import { generateDisplayNameSuggestion } from "@/lib/user/display-name";
import { RefreshCw, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface NicknameModalProps {
  initialSuggestion: string;
  onSaved: (displayName: string) => void;
  onDismiss: () => void;
}

/**
 * Kallenavn-onboarding for trading-konkurranse. Vises første gang en
 * innlogget bruker uten reelt kallenavn åpner leaderboard.
 * Budskap (Toms fakta-regel): ledertavlen er offentlig, kallenavnet er
 * det ENESTE som vises — fullt navn/e-post forblir private.
 */
export function NicknameModal({
  initialSuggestion,
  onSaved,
  onDismiss,
}: NicknameModalProps) {
  const t = useTranslations("competition");
  const [value, setValue] = useState(initialSuggestion);
  const [saving, setSaving] = useState(false);

  const handleSuggest = () => {
    setValue(generateDisplayNameSuggestion());
  };

  const handleSave = async () => {
    const displayName = value.trim();
    if (displayName.length < 2 || displayName.length > 30) {
      toast.error(t("nicknameInvalid"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/display-name", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(t("nicknameTaken"));
        return;
      }
      if (!res.ok) {
        toast.error(
          typeof body.error === "string" ? body.error : t("nicknameInvalid"),
        );
        return;
      }
      toast.success(t("nicknameSaved"));
      onSaved(displayName);
    } catch {
      toast.error(t("nicknameInvalid"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#1E2530] bg-[#0B0F19] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-400/10 p-2">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <h2 className="text-lg font-bold text-[#F9FAFB]">
            {t("nicknameTitle")}
          </h2>
        </div>

        <p className="text-sm text-[#9CA3AF]">{t("nicknameDesc")}</p>

        <div>
          <label
            htmlFor="nickname-input"
            className="text-xs uppercase tracking-wide text-[#6B7280]"
          >
            {t("nicknameLabel")}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="nickname-input"
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={30}
              className="flex-1 rounded-lg border border-[#2A2D35] bg-[#12151C] px-3 py-2 text-[#F9FAFB] focus:border-[#0052FF] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSuggest}
              aria-label={t("nicknameSuggest")}
              className="flex items-center gap-1 rounded-lg border border-[#2A2D35] px-3 py-2 text-sm text-[#6FA3FF] hover:border-[#0052FF]"
            >
              <RefreshCw className="h-4 w-4" />
              {t("nicknameSuggest")}
            </button>
          </div>
          <p className="mt-1 text-xs text-[#6B7280]">{t("nicknameHint")}</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={saving}
            className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#F9FAFB]"
          >
            {t("nicknameLater")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-[#0052FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0043D1] disabled:opacity-50"
          >
            {saving ? "…" : t("nicknameSave")}
          </button>
        </div>
      </div>
    </div>
  );
}
