/**
 * Mock reviews for Trustpilot integration
 * Used when no Trustpilot Business API key is available
 * Marked clearly as demo data
 */

export interface TrustpilotReview {
  id: string;
  stars: number;
  title: string;
  text: string;
  author: string;
  date: string;
  verified: boolean;
}

export interface TrustpilotSummary {
  stars: number;
  count: number;
  trustScore: number;
}

/**
 * Mock reviews with Norwegian names and realistic crypto learning content
 * DEMO DATA - Not from actual Trustpilot API
 */
export const mockReviews: TrustpilotReview[] = [
  {
    id: "mock-1",
    stars: 5,
    title: "Endelig forstår jeg krypto!",
    text: "Jeg har prøvd å lære meg kryptotrading i flere år, men alle plattformene var på engelsk og for kompliserte. Klarpakke forklarer alt på norsk og paper trading-funksjonen lar meg øve uten risiko. Etter 3 uker føler jeg meg faktisk klar til å handle med ekte penger.",
    author: "Ola Nordmann",
    date: "2026-02-15T10:30:00Z",
    verified: true,
  },
  {
    id: "mock-2",
    stars: 5,
    title: "Perfekt for nybegynnere",
    text: "Som student har jeg ikke råd til å tape penger på trading. Med Klarpakke kan jeg øve med 100 000 kr i lekepenger mens jeg lærer teknisk analyse. Kurset er godt strukturert og støtten er superhurtig.",
    author: "Kari Hansen",
    date: "2026-01-28T14:20:00Z",
    verified: true,
  },
  {
    id: "mock-3",
    stars: 4,
    title: "God plattform, savner flere coins",
    text: "Veldig fornøyd med læringsopplegget og paper trading. Eneste minuset er at jeg gjerne skulle hatt mulighet til å handle flere forskjellige kryptovalutaer. Forhåpentligvis kommer det snart!",
    author: "Per Kristiansen",
    date: "2026-02-05T09:15:00Z",
    verified: true,
  },
  {
    id: "mock-4",
    stars: 5,
    title: "Lærte mer på 2 uker enn på 6 måneder alene",
    text: "Har prøvd å lære meg trading via YouTube og Discord-grupper, men det var kaotisk. Klarpakke gir en strukturert læringssti som faktisk fungerer. AI-assistenten forklarer konseptene på en måte som er lett å forstå.",
    author: "Ingrid Solberg",
    date: "2026-03-10T16:45:00Z",
    verified: true,
  },
  {
    id: "mock-5",
    stars: 5,
    title: "Norsk support er gull verdt",
    text: "Hadde noen spørsmål om API-tilkobling til Binance. Fikk svar på norsk innen få timer. Dette er noe heeelt annet enn å prøve å få hjelp fra internasjonale børser. Anbefales på det sterkeste!",
    author: "Magnus Johansen",
    date: "2026-02-22T11:30:00Z",
    verified: true,
  },
  {
    id: "mock-6",
    stars: 4,
    title: "Bra kurs, men appen kunne vært raskere",
    text: "Innholdet i kursene er veldig bra og jeg har lært masse om risikostyring. Savner at appen loader litt raskere på mobil, men det er en minor issue. Sitter igjen med god kunnskap om trading.",
    author: "Sofie Andersen",
    date: "2026-01-15T13:20:00Z",
    verified: true,
  },
  {
    id: "mock-7",
    stars: 5,
    title: "Endelig en norsk krypto-plattform som holder mål",
    text: "Har ventet lenge på en norsk aktør innen kryptotrading-opplæring. Klarpakke leverer varene med profesjonelt opplegg, trygg paper trading og godt fokus på risikostyring. Føler meg mye tryggere nå.",
    author: "Erik Lund",
    date: "2026-03-01T08:45:00Z",
    verified: true,
  },
  {
    id: "mock-8",
    stars: 5,
    title: "Paper trading reddet meg fra å tape tusenvis",
    text: "Jeg var sikker på at jeg kunne trade, men etter å ha brukt paper trading i 2 uker innså jeg hvor mye jeg egentlig ikke visste. Nå har jeg bygget opp en solid strategi før jeg går live. Tusen takk Klarpakke!",
    author: "Lena Bakken",
    date: "2026-02-18T17:00:00Z",
    verified: true,
  },
];

/**
 * Summary statistics based on mock reviews
 * DEMO DATA
 */
export const mockSummary: TrustpilotSummary = {
  stars: 4.8,
  count: 1247,
  trustScore: 4.8,
};

/**
 * Check if we're using mock data
 */
export function isMockData(): boolean {
  return !process.env.TRUSTPILOT_API_KEY;
}
