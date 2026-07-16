"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles, ArrowRight, TrendingUp, Users, Award } from "lucide-react";
import styles from "./HeroSection.module.css";

/**
 * HeroSection — mobil-først hero for Klarpakke landing
 *
 * Bruker:
 *  - useTranslations('hero') for i18n
 *  - CSS-modul med var(--bg-primary), var(--accent), var(--text-primary)
 *  - Stats-horisontalscroll med scroll-snap pa mobil
 *  - Full-bredde CTA pa mobil, side-by-side pa 768px+
 */
export default function HeroSection() {
  const t = useTranslations("hero");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { icon: TrendingUp, value: "100 000 kr", label: t("trust.free") },
    { icon: Users, value: "4.9/5", label: t("social_proof_rating") },
    { icon: Award, value: "127+", label: t("social_proof_active") },
  ];

  return (
    <section className={styles.section}>
      {/* Decorative blobs */}
      <div className={styles.blobBlue} aria-hidden />
      <div className={styles.blobAmber} aria-hidden />
      <div className={styles.blobGreen} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* ---- Content column ---- */}
          <div className={`${styles.content} ${mounted ? styles.animate : ""}`}>
            {/* Badge */}
            <span className={styles.badge}>
              <Sparkles size={14} />
              {t("badge")}
            </span>

            {/* Title */}
            <h1 className={styles.title}>
              {t.rich("title", {
                accent: (chunks) => (
                  <span className={styles.titleAccent}>{chunks}</span>
                ),
              })}
            </h1>

            {/* Subtitle */}
            <p className={styles.subtitle}>{t("subtitle")}</p>

            {/* CTA buttons */}
            <div className={styles.ctaGroup}>
              <Link href="/no/signup" className={styles.ctaPrimary}>
                <Sparkles size={18} />
                {t("ctaPrimary")}
              </Link>

              <Link href="/no/pricing" className={styles.ctaSecondary}>
                {t("ctaSecondary")}
                <ArrowRight size={18} />
              </Link>
            </div>

            {/* Trust microcopy */}
            <div className={styles.trust}>
              <span>{t("trust.free")}</span>
              <span className={styles.trustDot}>•</span>
              <span>{t("trust.noCard")}</span>
              <span className={styles.trustDot}>•</span>
              <span>{t("trust.cancel")}</span>
            </div>
          </div>

          {/* ---- Visual column (glass card mockup) ---- */}
          <div
            className={`${styles.visual} ${mounted ? styles.animateScale : ""}`}
          >
            <div className={styles.glassCard}>
              {/* Coin row */}
              <div className={styles.glassRow}>
                <div className={styles.glassLabel}>BTC / USDT</div>
                <div className={styles.glassChange}>+2.4%</div>
              </div>

              {/* Price */}
              <div className={styles.glassValue}>$105,240</div>

              {/* Mini chart bar */}
              <div className={styles.glassBar}>
                <div className={styles.glassBarFill} />
              </div>

              {/* Buy / Sell buttons */}
              <div className={styles.glassActions}>
                <div className={styles.glassBuy}>Kjøp</div>
                <div className={styles.glassSell}>Selg</div>
              </div>

              <p className={styles.glassDisclaimer}>
                {t("disclaimer")}
              </p>
            </div>
          </div>
        </div>

        {/* ---- Stats bar (scroll-snap pa mobil) ---- */}
        <div
          className={`${styles.stats} ${mounted ? styles.animateDelay3 : ""}`}
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={styles.statCard}>
                <Icon
                  size={20}
                  style={{ color: "var(--accent)", marginBottom: 8 }}
                  aria-hidden
                />
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
