"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DotPattern } from "@/components/ui/dot-pattern";
import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  MessageCircle,
  PlayCircle,
  Quote,
  Shield,
  Smartphone,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    $crisp?: string[] & { push: (args: string[]) => void };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation Components
// ─────────────────────────────────────────────────────────────────────────────

function AnimatedCounter({
  target,
  duration = 2000,
  suffix = "",
}: {
  target: number;
  duration?: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count.toLocaleString("nb-NO")}
      {suffix}
    </span>
  );
}

function FadeInWhenVisible({
  children,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { y: 0, x: 40 },
    right: { y: 0, x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={isInView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Testimonials Component
// ─────────────────────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      "Endelig en plattform som lærer meg å trade på en trygg måte. Paper trading er genialt!",
    author: "Martin, 28",
    role: "Ingeniør",
  },
  {
    quote:
      "Gikk fra å tape penger på egenhånd til å forstå strategier. Beste investeringen jeg har gjort.",
    author: "Sarah, 34",
    role: "Markedsfører",
  },
  {
    quote:
      "AI-treneren hjelper meg å forstå hvorfor trades går bra eller dårlig. Fantastisk!",
    author: "Anders, 42",
    role: "Selger",
  },
];

function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
  const prev = () =>
    setCurrent(
      (prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length,
    );

  return (
    <div className="relative mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Quote className="mx-auto mb-4 h-10 w-10 text-blue-200" />
          <p className="mb-6 text-xl font-medium text-slate-700 italic">
            "{TESTIMONIALS[current].quote}"
          </p>
          <div>
            <p className="font-bold text-slate-900">
              {TESTIMONIALS[current].author}
            </p>
            <p className="text-sm text-slate-500">
              {TESTIMONIALS[current].role}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex justify-center gap-2">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Gå til tilbakemelding ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === current
                ? "w-6 bg-blue-600"
                : "w-2 bg-slate-300 hover:bg-slate-400",
            )}
          />
        ))}
      </div>

      {/* Arrow buttons */}
      <button
        onClick={prev}
        aria-label="Forrige tilbakemelding"
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 rounded-full bg-white p-2 shadow-lg hover:bg-slate-50"
      >
        <ChevronLeft className="h-5 w-5 text-slate-600" aria-hidden="true" />
      </button>
      <button
        onClick={next}
        aria-label="Neste tilbakemelding"
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full bg-white p-2 shadow-lg hover:bg-slate-50"
      >
        <ChevronRight className="h-5 w-5 text-slate-600" aria-hidden="true" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function KlarpakkeLanding() {
  const locale = useLocale();
  const t = useTranslations("landing");
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  // Word animation for title
  const titleWords = t("heroTitle").split(" ");
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.3 },
    },
  };
  const wordVariants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <div ref={containerRef} className="min-h-screen overflow-hidden bg-white">
      {/* 1. Hero with animated gradient background */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 lg:px-8">
        {/* Animated gradient mesh background */}
        <motion.div
          style={{ y: backgroundY }}
          className="absolute inset-0 -z-10"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -left-[10%] -top-[20%] h-[60%] w-[60%] rounded-full bg-blue-400/20 blur-[130px] mix-blend-multiply"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0], y: [0, -50, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] rounded-full bg-emerald-400/20 blur-[130px] mix-blend-multiply"
          />
          <DotPattern
            className={cn(
              "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
              "absolute inset-0 h-full w-full fill-gray-500/20",
            )}
          />
        </motion.div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            {t("badge")}
          </motion.div>

          {/* Title: Word-by-word reveal with blur */}
          <motion.h1
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
          >
            {titleWords.map((word, i) => (
              <motion.span
                key={i}
                variants={wordVariants}
                className="mr-[0.2em] inline-block"
              >
                {word === "Klarpakke" || word === "trading" ? (
                  <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    {word}
                  </span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle: Fade in with blur */}
          <motion.p
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-slate-600"
          >
            {t("heroDescription")}
          </motion.p>

          {/* CTA: Scale up with spring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring" as const,
              stiffness: 400,
              damping: 25,
              delay: 1,
            }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              size="lg"
              className="w-full gap-2 rounded-full bg-blue-600 px-8 py-6 text-lg text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-blue-600/40 sm:w-auto"
              asChild
            >
              <Link
                href={`/${locale}/beta/apply`}
                aria-label="Søk om tilgang til beta-programmet"
              >
                {t("heroButton")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <p className="mt-2 text-sm text-slate-500 sm:mt-0">
              {t("heroButtonSubtext")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="border-y border-slate-100 bg-slate-50/50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <StaggerContainer
            staggerDelay={0.15}
            className="grid grid-cols-3 gap-8 text-center"
          >
            <StaggerItem>
              <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
                <AnimatedCounter target={10000} suffix="+" />
              </div>
              <p className="mt-1 text-sm text-slate-500">Handler utført</p>
            </StaggerItem>
            <StaggerItem>
              <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
                <AnimatedCounter target={5} suffix="" />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Strategier tilgjengelig
              </p>
            </StaggerItem>
            <StaggerItem>
              <div className="text-3xl font-bold text-slate-900 sm:text-4xl">
                <AnimatedCounter target={1000000} suffix=" kr" />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Startkapital i paper mode
              </p>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Markets Section */}
      <section className="border-b border-slate-200 bg-slate-50/50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <FadeInWhenVisible>
            <p className="mb-8 text-center font-medium text-slate-500">
              {t("marketsTitle")}
            </p>
          </FadeInWhenVisible>
          <StaggerContainer
            staggerDelay={0.1}
            className="grid grid-cols-2 gap-4 md:grid-cols-4"
          >
            {[
              {
                symbol: "₿",
                name: "Bitcoin",
                change: "+2.4%",
                color: "bg-orange-100 text-orange-600",
              },
              {
                symbol: "Ξ",
                name: "Ethereum",
                change: "+1.8%",
                color: "bg-blue-100 text-blue-600",
              },
              {
                symbol: "S",
                name: "Solana",
                change: "+5.2%",
                color: "bg-emerald-100 text-emerald-600",
              },
              {
                symbol: "X",
                name: "XRP",
                change: "+0.9%",
                color: "bg-slate-100 text-slate-600",
              },
            ].map((coin) => (
              <StaggerItem key={coin.name}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -2 }}
                  className="group flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full font-bold transition-transform group-hover:scale-110",
                      coin.color,
                    )}
                    aria-hidden="true"
                  >
                    {coin.symbol}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{coin.name}</div>
                    <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />{" "}
                      {coin.change}
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Reality Check Section */}
      <section className="border-y border-slate-200 bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <FadeInWhenVisible>
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-slate-900">
                {t("realityCheck.title")}
              </h2>
              <p className="text-xl text-slate-600">
                {t("realityCheck.subtitle")}
              </p>
            </div>
          </FadeInWhenVisible>

          <StaggerContainer
            staggerDelay={0.15}
            className="grid gap-8 md:grid-cols-3"
          >
            <StaggerItem>
              <Card className="relative overflow-hidden border-red-100 bg-red-50/50 shadow-sm transition-transform hover:-translate-y-1">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-red-500/10"></div>
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                    <TrendingUp className="h-6 w-6 rotate-180 text-red-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    {t("realityCheck.betting.title")}
                  </h3>
                  <p className="mb-4 text-3xl font-black text-slate-900">
                    -100%
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {t("realityCheck.betting.desc")}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                    <Lock className="h-6 w-6 text-slate-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    {t("realityCheck.bank.title")}
                  </h3>
                  <p className="mb-4 text-3xl font-black text-slate-900">+2%</p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {t("realityCheck.bank.desc")}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem>
              <Card className="relative transform overflow-hidden border-blue-200 bg-blue-50/50 shadow-md transition-transform hover:-translate-y-1 md:scale-105">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-bl-full bg-blue-500/10"></div>
                <CardContent className="p-8">
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">
                    {t("realityCheck.krypto.title")}
                  </h3>
                  <p className="mb-4 text-3xl font-black text-blue-600">
                    {t("realityCheck.krypto.gain")}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {t("realityCheck.krypto.desc")}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <StaggerContainer
            staggerDelay={0.1}
            className="grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: Shield,
                color: "bg-blue-100 text-blue-600",
                titleKey: "whyUs.safe.title",
                descKey: "whyUs.safe.desc",
              },
              {
                icon: Smartphone,
                color: "bg-emerald-100 text-emerald-600",
                titleKey: "whyUs.simple.title",
                descKey: "whyUs.simple.desc",
              },
              {
                icon: Zap,
                color: "bg-green-100 text-green-600",
                titleKey: "whyUs.tech.title",
                descKey: "whyUs.tech.desc",
              },
            ].map((feature, i) => (
              <StaggerItem key={i}>
                <Card className="border-none bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                  <CardContent className="p-8">
                    <div
                      className={cn(
                        "mb-6 flex h-12 w-12 items-center justify-center rounded-2xl",
                        feature.color,
                      )}
                    >
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-slate-900">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="leading-relaxed text-slate-600">
                      {t(feature.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Is For You Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <FadeInWhenVisible>
            <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-8 text-white sm:p-12">
              <div className="absolute -right-32 -top-32 h-64 w-64 rounded-full bg-blue-500 opacity-50 blur-3xl"></div>

              <div className="relative z-10">
                <h2 className="mb-6 text-3xl font-bold">
                  {t("isForYou.title")}
                </h2>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-blue-100">
                  {t("isForYou.desc")}
                </p>

                <StaggerContainer staggerDelay={0.1} className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <StaggerItem key={i}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/50">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-lg">
                          {t(`isForYou.points.${i}`)}
                        </span>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Journey Section */}
      <section className="bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <FadeInWhenVisible>
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
              {t("journey.title")}
            </h2>
          </FadeInWhenVisible>

          <div className="space-y-8">
            {[
              {
                icon: PlayCircle,
                color: "text-blue-600",
                titleKey: "journey.week1.title",
                descKey: "journey.week1.desc",
              },
              {
                icon: Lock,
                color: "text-emerald-600",
                titleKey: "journey.week2.title",
                descKey: "journey.week2.desc",
              },
              {
                icon: Wrench,
                color: "text-orange-600",
                titleKey: "journey.week3.title",
                descKey: "journey.week3.desc",
              },
              {
                icon: TrendingUp,
                color: "text-green-600",
                titleKey: "journey.week4.title",
                descKey: "journey.week4.desc",
              },
            ].map((step, i, arr) => (
              <FadeInWhenVisible key={i} delay={i * 0.1}>
                <div className="flex gap-6">
                  <div className="shrink-0">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm"
                    >
                      <step.icon className={cn("h-6 w-6", step.color)} />
                    </motion.div>
                    {i < arr.length - 1 && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="mx-auto mt-4 h-full w-0.5 origin-top bg-slate-200"
                        style={{ height: "40px" }}
                      />
                    )}
                  </div>
                  <div className={cn("pb-8", i === arr.length - 1 && "pb-0")}>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-slate-600">{t(step.descKey)}</p>
                  </div>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <FadeInWhenVisible>
            <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
              Dette sier våre brukere
            </h2>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.2}>
            <TestimonialsCarousel />
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Support CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <FadeInWhenVisible>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
            >
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </motion.div>
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              {t("support.title")}
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-xl text-slate-600">
              {t("support.desc")}
            </p>
            <Button
              variant="outline"
              size="lg"
              className="rounded-full border-slate-300 px-8 text-slate-700 hover:bg-slate-50"
              onClick={() => window.$crisp?.push(["do", "chat:open"])}
            >
              {t("support.button")}
            </Button>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
