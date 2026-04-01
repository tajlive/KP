"use client";

import { motion } from "framer-motion";
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
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ButtonPremium } from "@/components/ui/ButtonPremium";

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
      <GlassCard
        variant="elevated"
        hover="lift"
        className={`h-full ${className}`}
      >
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}
        >
          <div className="text-kp-text-primary">{icon}</div>
        </div>
        <h3 className="text-lg font-semibold text-kp-text-primary mb-2">
          {title}
        </h3>
        <p className="text-sm text-kp-text-secondary leading-relaxed">
          {description}
        </p>
      </GlassCard>
    </motion.div>
  );
}

function LargeFeatureCard({
  icon,
  title,
  description,
  stats,
  className = "",
  delay = 0,
}: FeatureCardProps & { stats?: { value: string; label: string }[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className={`col-span-2 row-span-2 ${className}`}
    >
      <GlassCard
        variant="elevated"
        hover="lift"
        className="h-full relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-kp-brand/30 via-kp-brand/10 to-transparent opacity-50" />

        <div className="relative z-10 h-full flex flex-col">
          <div className="w-14 h-14 rounded-xl bg-kp-surface-highlight flex items-center justify-center mb-4">
            <div className="text-kp-brand">{icon}</div>
          </div>

          <h3 className="text-2xl font-bold text-kp-text-primary mb-3">
            {title}
          </h3>

          <p className="text-kp-text-secondary mb-6 leading-relaxed">
            {description}
          </p>

          {stats && (
            <div className="grid grid-cols-2 gap-4 mt-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-kp-surface/50">
                  <div className="text-xl font-bold text-kp-brand">{stat.value}</div>
                  <div className="text-xs text-kp-text-tertiary">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function FeaturesBentoGrid() {
  const features = [
    {
      icon: <GraduationCap className="w-6 h-6" />,
      title: "Gå fra nybegynner til trader på 4 uker",
      description: "Strukturerte kurs med videoer, quiz og praktiske øvelser. Du lærer i ditt eget tempo.",
      gradient: "from-blue-500/20 to-blue-500/5",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      title: "Øv uten å tape penger",
      description: "Start med 100 000 kr virtuelle penger. Få erfaring med ekte markedsdata før du bruker egne sparepenger.",
      gradient: "from-green-500/20 to-green-500/5",
    },
    {
      icon: <Bot className="w-6 h-6" />,
      title: "AI forteller deg når å kjøpe og selge",
      description: "Få tydelige signaler basert på teknisk analyse. AI-en overvåker markedet 24/7 for deg.",
      gradient: "from-purple-500/20 to-purple-500/5",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Stop-loss beskytter deg automatisk",
      description: "Sett dine egne risikogrenser. Systemet selger automatisk hvis markedet går mot deg.",
      gradient: "from-amber-500/20 to-amber-500/5",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Få signaler umiddelbart",
      description: "Ingen forsinkelse. Data kommer direkte fra Binance — verdens største kryptobørs.",
      gradient: "from-yellow-500/20 to-yellow-500/5",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Handelsboten handler mens du sover",
      description: "Auto-trading følger din strategi døgnet rundt. Du slipper å stirre på grafer hele dagen.",
      gradient: "from-cyan-500/20 to-cyan-500/5",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Norsk fellesskap",
      description: "Bli med i et voksende fellesskap av norske tradere. Støtte på norsk når du trenger det.",
      gradient: "from-pink-500/20 to-pink-500/5",
    },
  ];

  return (
    <section className="py-16 lg:py-24 bg-kp-bg-primary">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kp-brand/10 text-kp-brand text-sm font-medium mb-4"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Alt du trenger</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-kp-text-primary mb-4"
          >
            Hva du får med{" "}
            <span className="bg-gradient-to-r from-kp-brand to-kp-brand-light bg-clip-text text-transparent">
              Klarpakke
            </span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <LargeFeatureCard
            icon={<Bot className="w-7 h-7 text-kp-brand" />}
            title="Handelsboten handler mens du sover"
            description="Våre algoritmer analyserer markedet kontinuerlig og utfører handler automatisk basert på din strategi. Du bestemmer risikonivået — boten gjør jobben."
            stats={[
              { value: "24/7", label: "Overvåking" },
              { value: "<2s", label: "Responstid" },
            ]}
            delay={0.1}
          />

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
              <h3 className="text-xl font-bold text-white mb-3">Klar til å starte?</h3>
              <p className="text-white/80 mb-6">Bli med i dag og få tilgang til alle funksjoner.</p>
              <ButtonPremium
                variant="secondary"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                iconPosition="right"
              >
                Start gratis nå
              </ButtonPremium>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesBentoGrid;
