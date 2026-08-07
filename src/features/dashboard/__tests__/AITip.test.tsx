import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const dict: Record<string, string> = {
      "winRateLow.message": "Win rate på {winRate}% er lav. Gjennomgå tapende trades for å finne mønstre.",
      "winRateLow.action": "Gå til trade-historikk",
      "doingGreat.message": "Sterkt! {winRate}% win rate og positiv avkastning. Vurder å øke kapitalen gradvis.",
      "default.message": "Start din første Lekepenger-trade for å se AI-innsikt her.",
      "tryCopy.message": "Nye handler registrert. Sjekk topptrederne for inspirasjon.",
    };
    let s = dict[key] ?? key;
    if (values) {
      for (const [k, val] of Object.entries(values)) {
        s = s.replaceAll(`{${k}}`, String(val));
      }
    }
    return s;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/i18n/href-with-locale", () => ({
  hrefWithLocale: (_locale: string, href: string) => href,
}));

import { AITip } from "../AITip";

describe("AITip (FIKS 8-b: win-rate-tips uten udokumentert benchmark)", () => {
  it("winRate er desimal (0.60): viser «Sterkt! 60% win rate» — enhetsbug fikset (var >= 55 aldri sant)", () => {
    render(<AITip winRate={0.6} totalPnl={500} totalTrades={10} />);
    expect(screen.getByText(/Sterkt! 60% win rate/)).toBeTruthy();
  });

  it("lav win rate (0.39): viser nøytral fakta-melding UTEN «bransjesnittet (55%)»", () => {
    render(<AITip winRate={0.39} totalPnl={-830} totalTrades={19} />);
    const msg = screen.getByText(/Win rate på 39% er lav/);
    expect(msg).toBeTruthy();
    expect(screen.queryByText(/bransjesnittet/)).toBeNull();
    expect(screen.queryByText(/\(55%\)/)).toBeNull();
  });

  it("0 trades: viser default-melding", () => {
    render(<AITip winRate={0} totalPnl={0} totalTrades={0} />);
    expect(screen.getByText(/Start din første Lekepenger-trade/)).toBeTruthy();
  });
});
