"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import LivePriceChart from "./LivePriceChart";
import styles from "./HeroSection.module.css";

/**
 * HeroSection — Dark Revolut/OKX-inspired hero
 *
 * Design:
 *  - Dark navy (#0B0F19) + gradient bg
 *  - "Jeg tapte 64 000 kr på krypto. Så bygde jeg noe bedre."
 *  - Stats: −64 000 kr / +16 mnd / 0 kr
 *  - Live BTC price chart (Binance API, SVG area chart)
 *  - CTA: Start gratis + Les min historie
 *  - Mobile-first: full-width buttons; desktop: side-by-side
 */
export default function HeroSection() {
  const t = useTranslations("hero");
  const locale = useLocale();

  return (
    <section className={styles.section}>
      {/* Gradient overlay */}
      <div className={styles.gradientBg} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* ---- Content column ---- */}
          <div className={styles.content}>
            {/* Title */}
            <h1 className={styles.title}>
              <span className={styles.titleLine}>{t("titleLine1")}</span>
              <span className={styles.titleLineAlt}>{t("titleLine2")}</span>
            </h1>

            {/* Subtitle / description */}
            <p className={styles.subtitle}>{t("subtitle")}</p>

            {/* Stats row */}
            <div className={styles.stats}>
              <div className={styles.stat}>
                <div className={`${styles.statNum} ${styles.statLoss}`}>
                  {t("stat1")}
                </div>
                <div className={styles.statLabel}>{t("stat1Label")}</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.statNum} ${styles.statWin}`}>
                  {t("stat2")}
                </div>
                <div className={styles.statLabel}>{t("stat2Label")}</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.statNum} ${styles.statNeutral}`}>
                  {t("stat3")}
                </div>
                <div className={styles.statLabel}>{t("stat3Label")}</div>
              </div>
            </div>

            {/* CTA buttons */}
            <div className={styles.ctaGroup}>
              <Link href={`/${locale}/signup`} className={styles.ctaPrimary}>
                {t("ctaPrimary")}
              </Link>

              <Link href={`/${locale}/about`} className={styles.ctaSecondary}>
                {t("ctaSecondary")}
              </Link>
            </div>
          </div>

          {/* ---- Live BTC widget ---- */}
          <div className={styles.visual}>
            <LivePriceChart />
          </div>
        </div>
      </div>
    </section>
  );
}
