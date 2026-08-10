/**
 * KursPilot — ny /kurs-side «Pilot-løpet» (mega-plan Oppgave 1.2).
 *
 * Kontrakt:
 * - 4 moduler (Kom i gang, Slik tenker Piloten, Fra leke til ekte, Risiko)
 * - Hver modul: video-plassholder (ærlig «kommer snart»-tilstand) + tekst + «Merk som fullført»
 * - Fremdriftsindikator X/4, persistert i localStorage
 * - Modul 1 og 2 lenker videre til eksisterende leksjonsruter
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useLocale: () => "no",
  useTranslations: () => (key: string) => key,
}));

import KursPilot from "../KursPilot";

describe("KursPilot", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("viser nøyaktig 4 moduler, hver med video-plassholder", () => {
    const { container } = render(<KursPilot />);
    expect(container.querySelectorAll("details")).toHaveLength(4);
    expect(screen.getAllByTestId("video-slot")).toHaveLength(4);
  });

  it("fremdrift starter på 0/4 og går til 1/4 når modul merkes fullført", () => {
    render(<KursPilot />);
    expect(screen.getByTestId("fremdrift-teller").textContent).toBe("0/4");
    const knapper = screen.getAllByRole("button", { name: /markDone/ });
    fireEvent.click(knapper[0]);
    expect(screen.getByTestId("fremdrift-teller").textContent).toBe("1/4");
  });

  it("toggler tilbake når man trykker igjen (angre)", () => {
    render(<KursPilot />);
    const knapp = screen.getAllByRole("button", { name: /markDone/ })[0];
    fireEvent.click(knapp);
    expect(screen.getByTestId("fremdrift-teller").textContent).toBe("1/4");
    fireEvent.click(screen.getAllByRole("button", { name: /markUndone/ })[0]);
    expect(screen.getByTestId("fremdrift-teller").textContent).toBe("0/4");
  });

  it("leser lagret fremdrift fra localStorage ved oppstart", () => {
    localStorage.setItem(
      "klarpakke-kurs-fullfort",
      JSON.stringify(["mod1", "mod3"]),
    );
    render(<KursPilot />);
    expect(screen.getByTestId("fremdrift-teller").textContent).toBe("2/4");
  });

  it("modul 1 og 2 lenker til eksisterende leksjonsruter", () => {
    const { container } = render(<KursPilot />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/no/kurs/grunnleggende");
    expect(hrefs).toContain("/no/kurs/strategi");
  });
});
