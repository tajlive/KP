"use client";

import { useState, useRef, useEffect } from "react";

/** Krypto-glossar: norske forklaringer på tekniske termer. */
const GLOSSARY: Record<string, { term: string; short: string; explanation: string }> = {
  RSI: {
    term: "RSI",
    short: "Relativ StyrkeIndeks",
    explanation:
      "En momentum-indikator som måler hvor raskt prisen endrer seg på en skala fra 0 til 100. Over 70 = overkjøpt (kan falle), under 30 = oversolgt (kan stige). Brukes ofte for å finne vendepunkter.",
  },
  SMA: {
    term: "SMA",
    short: "Enkelt Glidende Gjennomsnitt (Simple Moving Average)",
    explanation:
      "Gjennomsnittsprisen over et bestemt antall perioder. For eksempel SMA 50 = snittprisen de siste 50 dagene. Hjelper med å se trendretning og jevne ut kortsiktige prissvingninger.",
  },
  EMA: {
    term: "EMA",
    short: "Eksponentielt Glidende Gjennomsnitt (Exponential Moving Average)",
    explanation:
      "Som SMA, men legger større vekt på nyeste priser. Reagerer raskere på prissvingninger. Vanligvis brukt i kortere tidshorisonter som 12 eller 26 perioder.",
  },
  DCA: {
    term: "DCA",
    short: "Gjennomsnittskjøp (Dollar Cost Averaging)",
    explanation:
      "Strategi der du kjøper et fast beløp med jevne mellomrom, uavhengig av pris. Reduserer risikoen for å kjøpe på topp og utnytter prisfall. Type «set-it-and-forget-it» for krypto.",
  },
  Stoploss: {
    term: "Stoploss",
    short: "Stopp-tap",
    explanation:
      "En automatisk ordre som selger hvis prisen faller til et bestemt nivå. Begrenser hvor mye du kan tape på en posisjon. Eksempel: Kjøper Bitcoin for 100 000, setter stoploss på 90 000 for å maks tape 10 %.",
  },
  "Take-profit": {
    term: "Take-profit",
    short: "Ta gevinst",
    explanation:
      "En automatisk ordre som selger når prisen når et forhåndsbestemt gevinstnivå. Sikrer at du faktisk realiserer gevinsten før markedet snur.",
  },
  Volatilitet: {
    term: "Volatilitet",
    short: "Volatilitet (prissvingning)",
    explanation:
      "Mål på hvor mye prisen svinger opp og ned. Høy volatilitet = store prisbevegelser (både opp og ned). Krypto er kjent for høy volatilitet, noe som gir både muligheter og risiko.",
  },
  "Limit-ordre": {
    term: "Limit-ordre",
    short: "Limit-ordre (grenseordre)",
    explanation:
      "En ordre som kun utføres til en bestemt pris eller bedre. Kjøper billigere enn markedspris eller selger dyrere. Ingen garanti for at ordren blir fylt hvis prisen ikke når nivået ditt.",
  },
  "Market-ordre": {
    term: "Market-ordre",
    short: "Markedsordre",
    explanation:
      "En ordre som utføres umiddelbart til gjeldende markedspris. Garant for gjennomføring, men du kan få litt dårligere pris enn forventet i volatile markeder (slippage).",
  },
  Margin: {
    term: "Margin",
    short: "Margin (belåning)",
    explanation:
      "Å handle med lånte penger. Forstørrer både gevinst og tap. Eksempel: Med 2x margin dobler du eksponeringen — stiger prisen 10 % tjener du 20 %, men faller den 50 % taper du alt.",
  },
  Likviditet: {
    term: "Likviditet",
    short: "Likviditet (omsetningsdybde)",
    explanation:
      "Hvor enkelt det er å kjøpe eller selge en kryptovaluta uten å påvirke prisen. Høy likviditet = små spreads og store ordrer kan fylles. Lav likviditet = risiko for glidning og vanskeligere å komme seg ut.",
  },
  Divergens: {
    term: "Divergens",
    short: "Divergens (motsatt signal)",
    explanation:
      "Når prisen beveger seg i én retning mens en indikator (som RSI) beveger seg motsatt. Kan signalisere at trenden er i ferd med å snu. Bearish divergens = pris stiger, RSI faller.",
  },
  "Support/Motstand": {
    term: "Support/Motstand",
    short: "Støtte og motstandsnivå",
    explanation:
      "Prisnivåer der kryptoen historisk har stoppet og snudd. Support = gulv der kjøperne pleier å tre inn. Motstand = tak der selgerne pleier å tre inn. Brudd på disse nivåene kan indikere ny trend.",
  },
  "Tether/USDT": {
    term: "Tether/USDT",
    short: "Stabil kryptovaluta",
    explanation:
      "En kryptovaluta som er festet til verdien av USD (1 USDT ≈ 1 $). Brukes som «trygg havn» i kryptomarkedet for å bevare verdi uten å veksle til vanlige penger. Ikke risikofritt — backing kan variere.",
  },
};

export interface GlossaryTooltipProps {
  /** Termnøkkelen — må finnes i glossaret */
  term: keyof typeof GLOSSARY;
  /** Valgfri className for flexibel styling */
  className?: string;
  /** Plassering av tooltip i forhold til teksten */
  position?: "top" | "bottom";
}

/**
 * Viser et kilkkbart/bart term-navn med en tooltip som inneholder en norsk
 * forklaring. Fungerer på både desktop (hover) og mobil (tap).
 *
 * @example
 * ```tsx
 * <GlossaryTooltip term="RSI" />
 * <GlossaryTooltip term="DCA" position="bottom" />
 * <span>Bruk <GlossaryTooltip term="Stoploss" /> for risikostyring</span>
 * ```
 */
export function GlossaryTooltip({
  term,
  className = "",
  position = "top",
}: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Lukk ved klikk utenfor
  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  // Lukk ved Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const entry = GLOSSARY[term];
  if (!entry) {
    return (
      <span className={`text-kp-brand underline decoration-dotted ${className}`}>
        {term}
      </span>
    );
  }

  const tooltipPositionClass = position === "bottom" ? "top-full mt-1" : "bottom-full mb-1";

  return (
    <span
      ref={ref}
      className={`relative inline-flex items-center ${className}`}
    >
      <button
        type="button"
        className="text-kp-brand underline decoration-dotted underline-offset-2 font-medium cursor-help"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        aria-expanded={open}
        aria-label={`${entry.term}: ${entry.short}`}
      >
        {entry.term}
      </button>

      {open && (
        <div
          className={`absolute z-50 left-1/2 -translate-x-1/2 ${tooltipPositionClass} w-72 p-3 rounded-xl shadow-2xl border border-white/10 bg-[#1a1b1e]/95 backdrop-blur-xl text-sm leading-relaxed`}
        >
          <div className="font-semibold text-kp-brand text-xs uppercase tracking-wider mb-1">
            {entry.term}
          </div>
          <div className="text-[11px] text-white/60 mb-1.5 italic">
            {entry.short}
          </div>
          <p className="text-white/85">{entry.explanation}</p>
          {/* Pil som peker mot triggeren */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-white/10 bg-[#1a1b1e]/95 ${
              position === "bottom"
                ? "-top-1 border-t border-l"
                : "-bottom-1 border-b border-r"
            }`}
          />
        </div>
      )}
    </span>
  );
}
