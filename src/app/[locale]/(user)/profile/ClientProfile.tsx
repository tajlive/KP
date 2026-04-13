"use client";

import { useProfile } from "@/hooks/useProfile";
import { createClient } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  Crown,
  Flame,
  Lock,
  Shield,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import {
  GamificationProvider,
  useGamification,
} from "@/features/gamification/GamificationProvider";
import { XPBar } from "@/features/gamification/XPBar";
import { LevelUpModal } from "@/features/gamification/LevelUpModal";
import { UpgradeBanner } from "@/features/dashboard/UpgradeBanner";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { LEARNING_TRACKS, type UserBadge } from "@/lib/learningTracks";
import { TIERS, type TierSlug } from "@/lib/pricing/tiers";

const TIER_LABELS: Record<TierSlug, string> = {
  student: "Student (Gratis)",
  bachelor: "Bachelor",
  master: "Master",
  phd: "PhD",
  professor: "Professor",
};

const TIER_ICONS: Record<TierSlug, React.ReactNode> = {
  student: <Star className="w-5 h-5" />,
  bachelor: <Shield className="w-5 h-5" />,
  master: <Crown className="w-5 h-5" />,
  phd: <Trophy className="w-5 h-5" />,
  professor: <Zap className="w-5 h-5" />,
};

const TIER_COLORS: Record<TierSlug, string> = {
  student: "from-slate-600 to-slate-700",
  bachelor: "from-blue-600 to-blue-700",
  master: "from-yellow-600 to-amber-600",
  phd: "from-purple-600 to-violet-600",
  professor: "from-rose-500 to-pink-600",
};

function ProfileContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { profile, loading, saving, error, save, patch, deleteProfile } =
    useProfile();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [risk, setRisk] = useState("normal");

  const { state: gamState } = useGamification();
  const { currentTier, tierData, loading: tierLoading } = useSubscription();
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);

  const locale = (pathname ?? "/no").split("/")[1] || "no";

  const fetchBadges = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // user_badges table not in generated Supabase types
      const { data: badgeData } = await (
        supabase as any as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (
                c: string,
                v: string,
              ) => Promise<{ data: Record<string, unknown>[] | null }>;
            };
          };
        }
      )
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id);
      if (badgeData?.length) {
        setEarnedBadges(
          badgeData.map((b: Record<string, unknown>) => ({
            id: String(b.badge_id ?? b.id ?? ""),
            trackId: String(b.track_id ?? ""),
            label: String(b.label ?? b.badge_id ?? ""),
            description: String(b.description ?? ""),
            earnedAt: String(b.earned_at ?? b.created_at ?? ""),
            icon: String(b.icon ?? "Award"),
          })),
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        const supportedLocales = ["no", "en", "th", "zh"];
        const safeLocale = supportedLocales.includes(locale) ? locale : "no";
        router.push(
          `/${safeLocale}/innlogging?next=${encodeURIComponent(pathname ?? "/")}`,
        );
      } else {
        setIsAuthenticated(true);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, [router, pathname, locale]);

  useEffect(() => {
    if (isAuthenticated) fetchBadges();
  }, [isAuthenticated, fetchBadges]);

  if (!authChecked) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-slate-400">Laster...</div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading)
    return (
      <div className="max-w-2xl mx-auto p-6 text-slate-400">
        Laster profil...
      </div>
    );

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-4 text-white">Profil</h1>
          <p className="text-slate-400">
            Ingen profil funnet. Lag en profil ved å fylle ut feltene under.
          </p>
          <div className="mt-4">
            <label htmlFor="fullName" className="text-sm text-slate-300">
              Navn
            </label>
            <input
              id="fullName"
              title="Fullt navn"
              placeholder="Skriv inn ditt fulle navn"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setFullName(e.target.value)}
            />
            <label
              htmlFor="avatarUrl"
              className="text-sm mt-3 block text-slate-300"
            >
              Avatar URL
            </label>
            <input
              id="avatarUrl"
              title="Avatar URL"
              placeholder="https://eksempel.com/bilde.jpg"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
            <label
              htmlFor="riskLevel"
              className="text-sm mt-3 block text-slate-300"
            >
              Risikonivå
            </label>
            <select
              id="riskLevel"
              title="Velg risikonivå"
              className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
              onChange={(e) => setRisk(e.target.value)}
            >
              <option value="safe">Trygg</option>
              <option value="normal">Normal</option>
              <option value="advanced">Avansert</option>
            </select>
            <button
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
              onClick={() =>
                save({
                  full_name: fullName,
                  avatar_url: avatarUrl,
                  risk_preference: risk,
                })
              }
            >
              {saving ? "Lagrer..." : "Opprett profil"}
            </button>
            {error && <div className="text-red-400 mt-2">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  const earnedBadgeIds = new Set(earnedBadges.map((b) => b.id));
  const lockedTracks = LEARNING_TRACKS.filter(
    (t) => !earnedBadgeIds.has(t.badgeId),
  );

  const tierFeatures = tierData?.features ?? [];
  const isHighestTier = currentTier === "professor";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* XP & Level Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold text-white">Min Profil</h1>
        <XPBar />
      </motion.div>

      {/* Streak highlight */}
      {gamState && gamState.current_streak > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 bg-linear-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl px-4 py-3"
        >
          <Flame className="w-6 h-6 text-orange-400 fill-orange-500 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-orange-300">
              {gamState.current_streak} dager streak!
            </p>
            <p className="text-xs text-orange-400/70">
              Fortsett å logge inn daglig for å holde streaken din.
            </p>
          </div>
        </motion.div>
      )}

      {/* Tier Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
      >
        <div
          className={`bg-linear-to-r ${TIER_COLORS[currentTier]} px-5 py-4 flex items-center gap-3`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white">
            {TIER_ICONS[currentTier]}
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Ditt abonnement</p>
            <p className="text-lg font-bold text-white">
              {TIER_LABELS[currentTier]}
              {!tierLoading && tierData && tierData.priceNOK > 0 && (
                <span className="text-sm font-normal text-white/60 ml-2">
                  {tierData.priceNOK} kr/mnd
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Inkludert i ditt abonnement
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tierFeatures.slice(0, 6).map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-300"
              >
                <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                {feature}
              </li>
            ))}
          </ul>
          {tierFeatures.length > 6 && (
            <p className="text-xs text-slate-500 mt-2">
              +{tierFeatures.length - 6} flere funksjoner
            </p>
          )}
        </div>
      </motion.div>

      {/* Upgrade CTA */}
      {!isHighestTier && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <UpgradeBanner tierSlug={currentTier} locale={locale} />
        </motion.div>
      )}

      {/* Badges Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-bold text-white">Badges</h2>
          <span className="ml-auto text-xs text-slate-500">
            {earnedBadges.length}/{LEARNING_TRACKS.length} opptjent
          </span>
        </div>

        {earnedBadges.length === 0 &&
        lockedTracks.length === LEARNING_TRACKS.length ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">
              Du har ingen badges ennå. Fullfør et kurs for å få din første!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Earned badges */}
            {earnedBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-3 bg-linear-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-yellow-400 to-orange-500 shadow-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {badge.label}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {badge.description}
                  </p>
                  {badge.earnedAt && (
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Opptjent{" "}
                      {new Date(badge.earnedAt).toLocaleDateString("no-NO")}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Locked badges */}
            {lockedTracks.map((track) => (
              <div
                key={track.badgeId}
                className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700">
                  <Lock className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-400 truncate">
                    {track.badgeLabel}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {track.badgeDescription}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Fullfør &quot;{track.title}&quot;
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-white">Innstillinger</h2>
        </div>

        <div>
          <label htmlFor="profileName" className="text-sm text-slate-300">
            Navn
          </label>
          <input
            id="profileName"
            title="Ditt navn"
            placeholder="Navn"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.full_name ?? ""}
            onBlur={(e) => patch({ full_name: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="profileAvatar" className="text-sm text-slate-300">
            Avatar URL
          </label>
          <input
            id="profileAvatar"
            title="Profilbilde URL"
            placeholder="URL til profilbilde"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.avatar_url ?? ""}
            onBlur={(e) => patch({ avatar_url: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="profileRisk" className="text-sm text-slate-300">
            Risikonivå
          </label>
          <select
            id="profileRisk"
            title="Risikopreferanse"
            className="w-full border border-slate-700 bg-slate-800 rounded px-3 py-2 mt-1 text-white"
            defaultValue={profile.risk_preference ?? "normal"}
            onChange={(e) => patch({ risk_preference: e.target.value })}
          >
            <option value="safe">Trygg</option>
            <option value="normal">Normal</option>
            <option value="advanced">Avansert</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <button
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            onClick={async () => {
              (await profile) && deleteProfile();
              location.reload();
            }}
          >
            Slett profil
          </button>
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}
      </motion.div>

      <LevelUpModal />
    </div>
  );
}

export default function ClientProfile() {
  return (
    <GamificationProvider>
      <ProfileContent />
    </GamificationProvider>
  );
}
