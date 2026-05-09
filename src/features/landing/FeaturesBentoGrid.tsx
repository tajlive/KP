"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  GraduationCap,
  Wallet,
  Bot,
  Shield,
  TrendingUp,
  Zap,
  Clock,
  Users,
  ArrowRight,
  Activity,
} from "lucide-react";
import { GlassCard } from "@/shared/ui/GlassCard";
import { ButtonPremium } from "@/shared/ui/ButtonPremium";
import { useEffect, useState } from "react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  gradient?: string;
  delay?: number;
}

function FeatureCard({
  icon,
  title,
  description,
  className = "",
  gradient = "from-kp-brand/20 to-kp-brand/5",
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
    >
      <GlassCard variant="elevated" hover="lift" className={`h-full ${className}`}>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
        >
          <div className="text-kp-text-primary">{icon}</div>
        </div>
        <h3 className="text-lg font-semibold text-kp-text-primary mb-2">{title}</h3>
        <p className="text-sm text-kp-text-secondary leading-relaxed">{description}</p>
      </GlassCard>
    </motion.div>
  );
}

function LiveSignalCard({ delay = 0 }: { delay?: number }) {
  const [signal, setSignal] = useState<"BUY" | "HOLD" | "SELL" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignal() {
      try {
        const res = await fetch("/api/signal/latest?symbol=BTCUSDT");
        if (!res.ok) throw new Error("Signal fetch failed");
        const data = (await res.json()) as { action?: string };
        const action = data.action?.toUpperCase();
        setSignal(action === "BUY" || action === "SELL" ? action : "HOLD");
      } catch {
        setSignal("HOLD");
      } finally {
        setLoading(false);
      }
    }

    fetchSignal();
    const interval = setInterval(fetchSignal, 60_000);
    return () => clearInterval(interval);
  }, []);

  const signalConfig = {
    BUY: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "KJØP" },
    SELL: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", label: "SALG" },
    HOLD: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "HOLD" },
  };

  const config = signal ? signalConfig[signal] : signalConfig.HOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="col-span-2 row-span-2"
    >
      <GlassCard variant="elevated" hover="lift" className="h-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-kp-brand/30 via-kp-brand/10 to-transparent opacity-50" />
        <div className="relative z-10 h-full flex flex-col">
          <div className="w-14 h-14 rounded-xl bg-kp-surface-highlight flex items-center justify-center mb-4">
            <Bot className="w-7 h-7 text-kp-brand" />
          </div>
          <h3 className="text-2xl font-bold text-kp-text-primary mb-3">AI-signaler i sanntid</h3>
          <p className="text-kp-text-secondary mb-6 leading-relaxed">
            Vår AI analyserer markedet kontinuerlig og gir deg tydelige kjøps-, salgs- eller hold-signaler
            basert på teknisk analyse.
          </p>

          <div className="mt-auto">
            <div
              className={`flex items-center justify-between p-4 rounded-xl border ${config.border} ${config.bg}`}
            >
              <div className="flex items-center gap-3">
                <Activity className={`w-5 h-5 ${config.color}`} />
                <div>
                  <p className={`text-sm font-medium ${config.color}`}>
                    BTC/USDT — Siste signal
                  </p>
                  <p className="text-xs text-kp-text-tertiary">
                    Oppdateres hvert minutt
                  </p>
                </div>
              </div>
              <div className="text-right">
                {loading ? (
                  <div className="w-16 h-6 bg-kp-surface-highlight animate-pulse rounded" />
                ) : (
                  <span className={`text-2xl font-black ${config.color}`}>{config.label}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function FeaturesBentoGrid() {
  const t = useTranslations("landing.bentoGrid");
  const tc = useTranslations("landing.common");

  const features = [
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: t("feature1Title"),
      description: t("feature1Desc"),
      gradient: "from-blue-500/20 to-blue-500/5",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: t("feature2Title"),
      description: t("feature2Desc"),
      gradient: "from-green-500/20 to-green-500/5",
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: t("feature3Title"),
      description: t("feature3Desc"),
      gradient: "from-purple-500/20 to-purple-500/5",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: t("feature4Title"),
      description: t("feature4Desc"),
      gradient: "from-amber-500/20 to-amber-500/5",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: t("feature5Title"),
      description: t("feature5Desc"),
      gradient: "from-yellow-500/20 to-yellow-500/5",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: t("feature6Title"),
      description: t("feature6Desc"),
      gradient: "from-cyan-500/20 to-cyan-500/5",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: t("feature7Title"),
      description: t("feature7Desc"),
      gradient: "from-pink-500/20 to-pink-500/5",
    },
  ];

  return (
    <section className="py-12 lg:py-16 bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{tc("bentoBadge")}</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-kp-text-primary mb-4"
          >
            {tc("bentoTitle")}{" "}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              Klarpakke
            </span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <LiveSignalCard delay={0.1} />

          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} delay={0.1 + index * 0.05} />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="col-span-1 md:col-span-2"
          >
            <GlassCard
              variant="glow"
              className="h-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-kp-brand to-kp-brand-dark"
            >
              <h3 className="text-xl font-bold text-white mb-3">{tc("bentoCtaTitle")}</h3>
              <p className="text-white/80 mb-6">{tc("bentoCtaDesc")}</p>
              <ButtonPremium
                variant="secondary"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                {tc("bentoCtaButton")}
              </ButtonPremium>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesBentoGrid;
