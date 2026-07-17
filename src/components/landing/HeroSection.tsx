"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import styles from "./HeroSection.module.css";

/**
 * HeroSection — Dark Revolut/OKX-inspired hero
 *
 * Design:
 *  - Dark navy (#0B0F19) + gradient bg
 *  - "Jeg tapte 64 000 kr på krypto. Så bygde jeg noe bedre."
 *  - Stats: −64 000 kr / +16 mnd / 0 kr
 *  - BTC widget (placeholder)
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

          {/* ---- BTC widget column ---- */}
          <div className={styles.visual}>
            <div className={styles.widgetCard}>
              {/* Coin header */}
              <div className={styles.widgetHeader}>
                <div className={styles.widgetCoin}>
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    aria-hidden
                  >
                    <circle cx="14" cy="14" r="14" fill="#F7931A" />
                    <path
                      d="M19.87 16.36c-.28 1.14-2.2 1.56-3.8 1.7l.72 2.88-1.76.44-.7-2.8c-.46.12-.94.22-1.4.32l.7 2.82-1.76.44-.72-2.88c-.38.1-.76.2-1.12.3l-.02-.1-2.42.6-.46-1.86c1.34-.34 2.38-.82 2.3-1.74.04-.52.2-2.38.24-2.74.12-.08.24-.14.38-.2-.1-.04-.2-.08-.28-.12l.84-3.36c.04-.6-.22-1.12-.8-1.36.18-.04.38-.08.58-.12l-.82-3.3 2.42-.6.8 3.2c.64-.18 1.3-.34 1.94-.5l-.8-3.2 1.76-.44.82 3.3c1.46-.28 2.58-.06 3.16.58.5.56.46 1.38.14 2.02-.62.68-1.28 1.04-1.28 1.04s.78.18 1.54.74c.64.48.9 1.28.52 2.28z"
                      fill="white"
                    />
                  </svg>
                  <span className={styles.widgetPair}>BTC / USDT</span>
                </div>
                <span className={styles.widgetChange}>+2.4%</span>
              </div>

              {/* Price */}
              <div className={styles.widgetPrice}>$105,240</div>

              {/* Mini chart bar */}
              <div className={styles.widgetChartBar}>
                <div className={styles.widgetChartFill} />
              </div>

              {/* Buy / Sell buttons */}
              <div className={styles.widgetActions}>
                <div className={styles.widgetBuy}>Kjøp</div>
                <div className={styles.widgetSell}>Selg</div>
              </div>

              {/* Tagline */}
              <div className={styles.widgetTagline}>
                🛡️ 100 000 kr i lekepenger — null risiko
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
