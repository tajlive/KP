/**
 * OmOssContent — Variant C-redesign (mega-plan Oppgave 1.4).
 *
 * Kontrakt:
 * - Toms historie rendres ORDRETT fra godkjent tekst (about.story.p1–p3 + sitat)
 * - Verdi-fakta-seksjon (values.*), «Hva gjør oss annerledes», risikoadvarsel
 * - Kontakt: post@klarpakke.no som eneste e-post
 * - CTA → /{locale}/register
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-intl/server", () => ({
  getTranslations: () => Promise.resolve((key: string) => key),
}));

import { OmOssContent } from "../OmOssContent";

describe("OmOssContent — Variant C", () => {
  it("viser Toms historie ordrett (story.p1–p3 + sitat + signatur)", async () => {
    render(await OmOssContent({ locale: "no" }));
    for (const key of [
      "story.p1",
      "story.p2",
      "story.p3",
      "story.quote",
      "story.quoteAuthor",
    ]) {
      expect(
        screen.getByText(new RegExp(key.replace(".", "\\.") + "(?!\\w)")),
        `mangler ${key}`,
      ).toBeTruthy();
    }
  });

  it("viser verdi-fakta, annerledes-liste og risikoadvarsel", async () => {
    render(await OmOssContent({ locale: "no" }));
    for (const key of [
      "values.education.title",
      "values.transparency.title",
      "values.norwegian.title",
      "values.risk.title",
      "different.paperTrading",
      "different.transparency",
      "risk.warning",
    ]) {
      expect(
        screen.getByText(new RegExp(key.replace(".", "\\."))),
        `mangler ${key}`,
      ).toBeTruthy();
    }
  });

  it("har post@klarpakke.no som mailto og CTA til /no/register", async () => {
    const { container } = render(await OmOssContent({ locale: "no" }));
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    // Under key-eko-mock: verifiser at riktig NØKKEL er koblet i mailto
    expect(hrefs).toContain("mailto:contact.emailValue");
    expect(hrefs).toContain("/no/register");
  });
});
