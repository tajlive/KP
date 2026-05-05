
import { useVippsMarket } from "@/shared/providers/VippsMarketProvider";
import { useTranslations } from "next-intl";
import { FAQList } from "./FAQList";

export default function FAQSection() {
  const { showVipps } = useVippsMarket();
  const t = useTranslations("FAQ.fallbacks");

  const faqs = [
    { question: t("f1.q"), answer: t("f1.a") },
    { question: t("f2.q"), answer: t("f2.a") },
    { question: t("f3.q"), answer: t("f3.a") },
    { question: t("f4.q"), answer: t("f4.a") },
    { question: t("f5.q"), answer: t("f5.a") },
    {
      question: t(showVipps ? "f6_vipps.q" : "f6_stripe.q"),
      answer: t(showVipps ? "f6_vipps.a" : "f6_stripe.a"),
    },
    { question: t("f7.q"), answer: t("f7.a") },
    { question: t("f8.q"), answer: t("f8.a") },
    { question: t("f9.q"), answer: t("f9.a") },
    { question: t("f10.q"), answer: t("f10.a") },
  ];

  return <FAQList faqs={faqs} />;
}
