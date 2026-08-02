"use client";

import { Button } from "@/shared/ui/button";
import { Check, HelpCircle } from "lucide-react";
import Link from "next/link";
import { PricingGrid } from "./PricingGrid";

const FEATURES = {
  student: ["Papirhandel 100k", "1 auto-strategi", "AI-signaler", "Community"],
  bachelor: ["Alt i Student", "Live trading", "3 strategier", "Copy-trading paper"],
  master: ["Alt i Bachelor", "7 strategier", "VIP-signaler", "Live copy-trading"],
  phd: ["Alt i Master", "Ubegrenset strategier", "1:1 rådgiver", "API-tilgang"],
  professor: ["Alt i PhD", "1:1 coaching", "Alpha-strategier", "Founder-gruppe"],
};

const PRICES = [
  { slug: "student", name: "Student", price: 0, popular: false },
  { slug: "bachelor", name: "Bachelor", price: 249, popular: false },
  { slug: "master", name: "Master", price: 499, popular: true },
  { slug: "phd", name: "PhD", price: 999, popular: false },
  { slug: "professor", name: "Professor", price: 1999, popular: false },
];

export function PriserContent() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-16 lg:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
          Velg din plan
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Start gratis, oppgrader når du er klar. Alle planer inkluderer papirhandel og AI-signaler.
        </p>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
        {PRICES.map((plan) => (
          <div
            key={plan.slug}
            className={`relative rounded-2xl border p-6 flex flex-col ${
              plan.popular
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                : "border-slate-200 bg-white"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
                Mest populær
              </span>
            )}
            <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
            <div className="mb-4">
              {plan.price === 0 ? (
                <span className="text-3xl font-bold text-slate-900">Gratis</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500"> kr/mnd</span>
                </>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES[plan.slug as keyof typeof FEATURES].map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={`/no/register?plan=${plan.slug}`}
              className={`w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold transition-all ${
                plan.popular
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {plan.price === 0 ? "Start gratis" : "Velg plan"}
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-slate-400">
        <HelpCircle className="w-4 h-4 inline mr-1" />
        Alle priser er inkl. MVA. Ingen bindingstid. Avslutt når som helst.
      </div>
    </div>
  );
}
