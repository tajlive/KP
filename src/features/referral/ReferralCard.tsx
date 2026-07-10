"use client";
import React, { useState, useCallback, useEffect } from "react";
import {
  Copy,
  Check,
  Share2,
  Gift,
  Users,
  TrendingUp,
  ExternalLink,
  Trophy,
  Facebook,
  MessageCircle,
  Linkedin,
  Sparkles,
  Crown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReferralStats {
  totalInvited: number;
  convertedCount: number;
  totalBonusNok: number;
  monthlyCount: number;
}

export interface ReferralData {
  stats: ReferralStats;
  referralLink: string;
  profileCode: string;
  topReferrers: Array<{
    user_id: string;
    display_name: string;
    count: number;
  }>;
}

// ---------------------------------------------------------------------------
// Share helpers
// ---------------------------------------------------------------------------

const SHARE_TEXT_NO =
  "🎯 Bli med på Klarpakke – Norges smarteste handelsplattform! Få 5 000 kr i lekepenger å trade for helt gratis 🚀";

function openShareWindow(url: string) {
  const w = 600;
  const h = 500;
  const left = Math.max(0, (window.innerWidth - w) / 2);
  const top = Math.max(0, (window.innerHeight - h) / 2);
  window.open(
    url,
    "share",
    `width=${w},height=${h},left=${left},top=${top},noopener,noreferrer`,
  );
}

// ---------------------------------------------------------------------------
// ReferralCard Component
// ---------------------------------------------------------------------------

interface ReferralCardProps {
  locale?: string;
}

export function ReferralCard({ locale = "no" }: ReferralCardProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/referral");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Logg inn for å se dine henvisninger.");
          return;
        }
        throw new Error("Kunne ikke hente data");
      }
      const json = await res.json();
      setData({
        stats: json.stats,
        referralLink: json.referralLink,
        profileCode: json.profileCode || "",
        topReferrers: json.topReferrers || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast.success("Lenke kopiert! 📋");
    setTimeout(() => setCopied(false), 2500);
  };

  const shareFacebook = () => {
    if (!data?.referralLink) return;
    openShareWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.referralLink)}&quote=${encodeURIComponent(SHARE_TEXT_NO)}`,
    );
  };

  const shareTwitter = () => {
    if (!data?.referralLink) return;
    openShareWindow(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT_NO)}&url=${encodeURIComponent(data.referralLink)}`,
    );
  };

  const shareLinkedIn = () => {
    if (!data?.referralLink) return;
    openShareWindow(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.referralLink)}`,
    );
  };

  const isTopRecruiter =
    data?.topReferrers?.some(
      (r) =>
        r.user_id === "me" || r.count >= 3,
    ) ?? false;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/80">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" />
      </div>
    );
  }

  // ── Error state ──
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-[#EF4444]/30 bg-[#7F1D1D]/20 p-6 text-center">
        <p className="text-[#EF4444] text-sm">
          {error || "Kunne ikke laste henvisningsdata."}
        </p>
        <button
          onClick={fetchReferralData}
          className="mt-3 text-xs text-[#F59E0B] hover:underline"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  const { stats, referralLink } = data;
  const paperBonusFormatted = stats.totalBonusNok.toLocaleString("nb-NO");

  return (
    <div className="space-y-6">
      {/* ── Hovedkort: "Få en venn til å trade" ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-br from-[#78350F]/30 via-[#1A1D26] to-[#1A1D26] p-6"
      >
        {/* Glødeffekt */}
        <div className="pointer-events-none absolute -inset-1/2 bg-gradient-to-r from-transparent via-[#F59E0B]/5 to-transparent opacity-40 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/15">
              <Gift className="h-6 w-6 text-[#F59E0B]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#F9FAFB]">
                Få en venn til å trade 🚀
              </h3>
              <p className="text-sm text-[#9CA3AF]">
                Dere får begge{" "}
                <span className="font-semibold text-[#F59E0B]">
                  5 000 kr i lekepenger
                </span>{" "}
                — helt gratis
              </p>
            </div>
          </div>

          {/* Statistikk */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/60 p-3">
              <Users className="mb-1 h-4 w-4 text-[#3B82F6]" />
              <div className="text-lg font-bold text-[#F9FAFB]">
                {stats.totalInvited}
              </div>
              <div className="text-xs text-[#6B7280]">Inviterte</div>
            </div>
            <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/60 p-3">
              <TrendingUp className="mb-1 h-4 w-4 text-[#10B981]" />
              <div className="text-lg font-bold text-[#10B981]">
                {paperBonusFormatted}
              </div>
              <div className="text-xs text-[#6B7280]">Opptjent bonus</div>
            </div>
            <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/60 p-3">
              <Trophy className="mb-1 h-4 w-4 text-[#F59E0B]" />
              <div className="text-lg font-bold text-[#F9FAFB]">
                {stats.monthlyCount}
              </div>
              <div className="text-xs text-[#6B7280]">Denne måneden</div>
            </div>
            <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/60 p-3">
              <Crown
                className={`mb-1 h-4 w-4 ${isTopRecruiter ? "text-[#F59E0B]" : "text-[#6B7280]"}`}
              />
              <div className="text-lg font-bold text-[#F9FAFB]">
                {isTopRecruiter ? "🏆" : "—"}
              </div>
              <div className="text-xs text-[#6B7280]">Top Recruiter</div>
            </div>
          </div>

          {/* Din unike lenke */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#9CA3AF]">
              Din unike henvisningslenke
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/80 px-4 py-2.5 font-mono text-sm text-[#F59E0B]">
                {referralLink}
              </div>
              <Button
                onClick={copyLink}
                variant="primary"
                size="sm"
                className="min-w-[44px]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#10B981]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {copied ? "Kopiert!" : "Kopier"}
                </span>
              </Button>
            </div>
          </div>

          {/* Del på sosiale medier */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF]">
              <Share2 className="h-3.5 w-3.5" /> Del med venner
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={shareFacebook}
                className="flex items-center gap-1.5 rounded-lg bg-[#1877F2]/20 px-3.5 py-2 text-xs font-medium text-[#1877F2] transition-all hover:bg-[#1877F2]/30 active:scale-95"
              >
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Facebook</span>
              </button>
              <button
                onClick={shareTwitter}
                className="flex items-center gap-1.5 rounded-lg bg-[#1DA1F2]/20 px-3.5 py-2 text-xs font-medium text-[#1DA1F2] transition-all hover:bg-[#1DA1F2]/30 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Twitter</span>
              </button>
              <button
                onClick={shareLinkedIn}
                className="flex items-center gap-1.5 rounded-lg bg-[#0A66C2]/20 px-3.5 py-2 text-xs font-medium text-[#0A66C2] transition-all hover:bg-[#0A66C2]/30 active:scale-95"
              >
                <Linkedin className="h-4 w-4" />
                <span className="hidden sm:inline">LinkedIn</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                  toast.success("Lenke kopiert! 📋");
                }}
                className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B]/15 px-3.5 py-2 text-xs font-medium text-[#F59E0B] transition-all hover:bg-[#F59E0B]/25 active:scale-95"
              >
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Kopier lenke</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Hvordan det fungerer ── */}
      <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F9FAFB]">
          <Gift className="h-4 w-4 text-[#F59E0B]" />
          Slik fungerer det
        </h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/15">
              <span className="font-bold text-[#3B82F6]">1</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              Del din unike lenke med en venn
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/15">
              <span className="font-bold text-[#3B82F6]">2</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              Vennen registrerer seg og begynner å trade
            </p>
          </div>
          <div className="rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#3B82F6]/15">
              <span className="font-bold text-[#3B82F6]">3</span>
            </div>
            <p className="text-sm text-[#9CA3AF]">
              Dere får begge{" "}
              <span className="font-semibold text-[#F59E0B]">5 000 kr</span>{" "}
              ekstra i lekepenger
            </p>
          </div>
        </div>
      </div>

      {/* ── Belønningssystem — Top Recruiter Badge ── */}
      <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F9FAFB]">
          <Trophy className="h-4 w-4 text-[#F59E0B]" />
          Belønninger & utmerkelser
        </h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F59E0B]/15">
              <Sparkles className="h-5 w-5 text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F9FAFB]">
                5 000 kr paper bonus
              </p>
              <p className="text-xs text-[#6B7280]">
                Til deg og vennen din når vennen fullfører sin første handel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3B82F6]/15">
              <Crown className="h-5 w-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F9FAFB]">
                Top Recruiter 🏆
              </p>
              <p className="text-xs text-[#6B7280]">
                De 3 med flest inviterte denne måneden får et eksklusivt badge
                på profilen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[#2A2D35] bg-[#0A0B0D]/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#10B981]/15">
              <TrendingUp className="h-5 w-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F9FAFB]">
                Leaderboard — Flest inviterte
              </p>
              <p className="text-xs text-[#6B7280]">
                Se hvem som har invitert flest denne måneden på leaderboardet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Referrers (mini leaderboard) ── */}
      {data.topReferrers.length > 0 && (
        <div className="rounded-2xl border border-[#2A2D35] bg-[#1A1D26]/60 p-6">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#F9FAFB]">
            <Trophy className="h-4 w-4 text-[#F59E0B]" />
            Topp-ververe denne måneden
          </h4>
          <div className="space-y-2">
            {data.topReferrers.slice(0, 5).map((referrer, i) => (
              <div
                key={referrer.user_id}
                className={`flex items-center justify-between rounded-lg border border-[#2A2D35] bg-[#0A0B0D]/40 px-3 py-2 ${
                  i === 0
                    ? "border-[#F59E0B]/30"
                    : i === 1
                      ? "border-[#9CA3AF]/20"
                      : i === 2
                        ? "border-[#78350F]/20"
                        : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center text-sm font-bold text-[#6B7280]">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <span className="text-sm font-medium text-[#F9FAFB]">
                    {referrer.display_name || `Bruker ${referrer.user_id.slice(0, 6)}`}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#F59E0B]">
                  {referrer.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lenke til Golden Ticket-seksjonen ── */}
      <div className="rounded-xl border border-[#3B82F6]/20 bg-[#3B82F6]/5 p-4 text-center">
        <p className="text-sm text-[#9CA3AF]">
          Du kan også generere{" "}
          <a
            href={`/${locale}/dashboard/referral`}
            className="font-medium text-[#3B82F6] hover:underline"
          >
            Golden Ticket-invitasjoner
          </a>{" "}
          for å gi venner gratis Master-tier tilgang.
          <ExternalLink className="ml-1 inline h-3 w-3" />
        </p>
      </div>
    </div>
  );
}
