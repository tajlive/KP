import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-static";

const BODY = `# Klarpakke

> Klarpakke er Norges enkleste måte å lære krypto-trading på — med 100 000 kr i lekepenger, null risiko og ekte markedsdata. «Folkets AI-pilot» (grid-strategi) kjører på Kraken.

## Offentlige sider

- [Forside](https://www.klarpakke.no/)
- [Priser](https://www.klarpakke.no/priser)
- [Om oss](https://www.klarpakke.no/om-oss)
- [Kontakt](https://www.klarpakke.no/kontakt)
- [Hjelp](https://www.klarpakke.no/hjelp)
- [Vanlige spørsmål](https://www.klarpakke.no/vanlige-sporsmal)
- [API-dokumentasjon](https://www.klarpakke.no/api-dokumentasjon)
- [Founder](https://www.klarpakke.no/founder)

## Fakta

- 100 000 kr lekepenger til nye brukere (paper trading, null risiko)
- Ekte markedsdata fra Kraken
- Verdenslansering: 1. september
- Founder-program: De 100 første registrerte får gratis tilgang for livet + 5 000 KLT-bonus

## Kontakt

post@klarpakke.no
`;

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
