"use client";

import { motion } from "framer-motion";
import { Shield, CreditCard, Lock, FileText, ChevronDown } from "lucide-react";
import { useState } from "react";

const trustBadges = [
  {
    icon: Shield,
    title: "Sikker pålogging",
    description:
      "Innlogging via Apple eller e-post. Din konto er beskyttet med sikker autentisering.",
  },
  {
    icon: CreditCard,
    title: "Trygg betaling med Stripe",
    description:
      "Alle betalinger håndteres av Stripe, en av verdens ledende betalingsleverandører. Kortinformasjonen din lagres aldri hos oss.",
  },
  {
    icon: Lock,
    title: "Kryptert data",
    description:
      "All kommunikasjon er kryptert. Se personvernerklæringen for informasjon om databehandling.",
  },
  {
    icon: FileText,
    title: "Norsk mva og kvittering",
    description:
      "Alle kjøp inkluderer norsk mva. Du får tilsendt kvittering på e-post umiddelbart etter kjøp.",
  },
];

const faqs = [
  {
    question: "Hva koster det?",
    answer:
      "Vi har flere prisnivåer: Student (gratis), Bachelor (199 kr/mnd), Master (399 kr/mnd) og PhD (999 kr/mnd). Alle abonnementer kan betales månedlig eller årlig med 20% rabatt.",
  },
  {
    question: "Kan jeg avslutte når som helst?",
    answer:
      "Ja, du kan kansellere abonnementet ditt når som helst fra kontoinnstillingene. Du beholder tilgangen ut perioden du har betalt for. Ingen skjulte gebyrer eller bindingstid.",
  },
  {
    question: "Hva skjer etter betaling?",
    answer:
      "Umiddelbart etter betaling får du full tilgang til alle funksjoner i din valgte plan. Du mottar en kvittering på e-post, og abonnementet fornyes automatisk til du velger å avslutte.",
  },
  {
    question: "Er dette trygt?",
    answer:
      "Ja. Vi bruker sikker pålogging, Stripe for betaling, og all data er kryptert. Vi er registrert i Norge og følger norske lover og regler. Vi har ikke tilgang til dine betalingskort.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-white/[0.08] last:border-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-medium text-white">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-white/50" />
        </motion.div>
      </button>
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <p className="pb-4 text-sm leading-relaxed text-white/60">{answer}</p>
      </motion.div>
    </div>
  );
}

interface TrustSectionProps {
  showFAQ?: boolean;
  compact?: boolean;
}

export function TrustSection({
  showFAQ = true,
  compact = false,
}: TrustSectionProps) {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-4 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <Shield size={12} />
          <span>Sikker pålogging</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CreditCard size={12} />
          <span>Stripe-betaling</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock size={12} />
          <span>Kryptert kommunikasjon</span>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full py-12">
      <div className="mx-auto max-w-4xl px-4">
        {/* Trust badges */}
        <div className="mb-12">
          <h2 className="mb-6 text-center text-lg font-semibold text-white">
            Din sikkerhet er vår prioritet
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {trustBadges.map((badge, index) => (
              <motion.div
                key={badge.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
                  <badge.icon size={20} className="text-white/70" />
                </div>
                <div>
                  <h3 className="mb-1 font-medium text-white">{badge.title}</h3>
                  <p className="text-sm leading-relaxed text-white/50">
                    {badge.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        {showFAQ && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
            <h2 className="mb-6 text-lg font-semibold text-white">
              Ofte stilte spørsmål
            </h2>
            <div>
              {faqs.map((faq, index) => (
                <FAQItem
                  key={faq.question}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onToggle={() => setOpenFAQ(openFAQ === index ? null : index)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
