"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Footer() {
  const [currentYear, setCurrentYear] = useState(2026);
  const locale = useLocale();
  const t = useTranslations("footer");

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Helper for canonical paths - norsk default skal ikke ha /no/ prefix
  const canonicalPath = (path: string) => {
    if (locale === "no") {
      return path;
    }
    return `/${locale}${path}`;
  };

  const links = {
    product: [
      { href: canonicalPath("/kurs"), label: t("links.courses") },
      { href: canonicalPath("/paper-trading"), label: t("links.paperTrading") },
      { href: canonicalPath("/priser"), label: t("links.pricing") },
    ],
    company: [
      { href: canonicalPath("/kontakt"), label: t("links.contact") },
    ],
    legal: [
      { href: canonicalPath("/personvern"), label: t("links.privacy") },
      { href: canonicalPath("/vilkar"), label: t("links.terms") },
    ],
  };

  const socialLinks = [
    {
      name: "Instagram",
      href: "https://instagram.com/klarpakke",
      icon: (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: "https://facebook.com/klarpakke",
      icon: (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "Twitter",
      href: "https://twitter.com/klarpakke",
      icon: (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      href: "https://linkedin.com/company/klarpakke",
      icon: (
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-[#1A1D26]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href={canonicalPath("/")} className="flex items-center mb-4">
              <Image
                src="/logo.svg"
                alt="Klarpakke"
                width={140}
                height={36}
                className="h-9 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              {t("tagline")}
            </p>

            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors duration-200"
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">
              {t("product")}
            </h3>
            <ul className="space-y-3">
              {links.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">
              {t("company")}
            </h3>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">
              {t("legal")}
            </h3>
            <ul className="space-y-3">
              {links.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/50 text-sm hover:text-white transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 py-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-white/60 text-xs">{t("paymentLabel")}</span>
            <div className="flex items-center gap-4">
              {/* Card icons */}
              <div className="flex items-center gap-1 text-white/50">
                <svg
                  className="w-6 h-4"
                  viewBox="0 0 48 32"
                  fill="currentColor"
                >
                  <rect width="48" height="32" rx="4" fill="#1A1F71" />
                  <path
                    d="M19.5 21.5L21 10.5H24L22.5 21.5H19.5Z"
                    fill="white"
                  />
                  <path
                    d="M32.5 10.7C32 10.5 31.2 10.3 30.2 10.3C27.5 10.3 25.5 11.8 25.5 13.9C25.5 15.5 26.8 16.4 27.8 16.9C28.8 17.4 29.2 17.8 29.2 18.3C29.2 19.1 28.2 19.5 27.2 19.5C26 19.5 25.3 19.3 24.5 18.9L24 18.7L23.5 21.4C24.2 21.7 25.5 22 27 22C30 22 32 20.5 32 18.2C32 16.9 31.2 16 29.5 15.2C28.5 14.7 27.9 14.3 27.9 13.8C27.9 13.3 28.5 12.8 29.7 12.8C30.7 12.8 31.4 13 32 13.2L32.4 13.4L32.5 10.7Z"
                    fill="white"
                  />
                </svg>
                <svg
                  className="w-6 h-4"
                  viewBox="0 0 48 32"
                  fill="currentColor"
                >
                  <rect width="48" height="32" rx="4" fill="#EB001B" />
                  <circle cx="19" cy="16" r="10" fill="#EB001B" />
                  <circle cx="29" cy="16" r="10" fill="#F79E1B" />
                  <path
                    d="M24 8.5C26.5 10.5 28 13 28 16C28 19 26.5 21.5 24 23.5C21.5 21.5 20 19 20 16C20 13 21.5 10.5 24 8.5Z"
                    fill="#FF5F00"
                  />
                </svg>
              </div>
              <span className="text-white/30">|</span>
              {/* Stripe */}
              <span className="text-xs text-white/50">Stripe</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/60 text-sm leading-relaxed max-w-3xl">
            {t("disclaimer")}
          </p>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-sm">
              {t("copyright", { year: currentYear })}
            </p>
            <div className="flex gap-6">
              <Link
                href={canonicalPath("/personvern")}
                className="text-white/60 text-sm hover:text-white/70 transition-colors duration-200"
              >
                {t("links.privacy")}
              </Link>
              <Link
                href={canonicalPath("/vilkar")}
                className="text-white/60 text-sm hover:text-white/70 transition-colors duration-200"
              >
                {t("links.terms")}
              </Link>
              <Link
                href={canonicalPath("/kontakt")}
                className="text-white/60 text-sm hover:text-white/70 transition-colors duration-200"
              >
                {t("links.contact")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
