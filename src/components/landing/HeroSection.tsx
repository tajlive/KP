"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import styles from "./HeroSection.module.css";

/**
 * HeroSection — Dark Revolut/OKX-inspired hero
 *
 * Design:
 *  - Dark navy (#0B0F19) + gradient bg
 *  - "Jeg tapte 64 000 kr på krypto. Du trenger ikke gjøre det samme."
 *  - Stats (verifiserbare fakta): 100 000 kr lekepenger / Live sanntidskurser / 0 kr innskudd
 *  - Produkt-preview: ekte dashboard-screenshot i telefonramme
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
                <div className={`${styles.statNum} ${styles.statWin}`}>
                  {t("stat1")}
                </div>
                <div className={styles.statLabel}>{t("stat1Label")}</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.statNum} ${styles.statBrand}`}>
                  {t("stat2")}
                </div>
                <div className={styles.statLabel}>{t("stat2Label")}</div>
              </div>
              <div className={styles.stat}>
                <div className={`${styles.statNum} ${styles.statWin}`}>
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

          {/* ---- Product preview: ekte dashboard i telefonramme ---- */}
          <div className={styles.visual}>
            <div className={styles.phoneFrame}>
              <Image
                src="/screenshots/hero-dashboard.png"
                alt="Klarpakke-appen: dashboard med lekepenger, sjekkliste og statistikk"
                fill
                priority
                sizes="(max-width: 768px) 300px, 340px"
                className={styles.phoneImg}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
