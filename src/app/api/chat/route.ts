import { getErrorMessage } from "@/lib/utils/error";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.warn(
        "PERPLEXITY_API_KEY not set - Chat service in maintenance mode",
      );
      return NextResponse.json(
        {
          error:
            "AI Professor er for øyeblikket i vedlikehold. Vennligst prøv igjen senere.",
        },
        { status: 503 },
      );
    }
    // Call Perplexity API directly
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `Du er en hjelpsom og kunnskapsrik "Krypto-Professor" for Klarpakke Universitet. 
Din jobb er å hjelpe studenter med å forstå kryptovaluta, trading og blokkjedeteknologi.
Du har tilgang til sanntidsinformasjon fra nettet via Perplexity. Bruk dette til å gi oppdaterte svar om markedsdata og nyheter.
Klarpakke Spesifikk Info:
- Vi bruker Kraken API for handel. Brukere må ha USDT på sin Kraken-konto for at roboten skal kunne handle.
- Roboten tar IKKE full kontroll over pengene. Den sender kun kjøps-/salgsordre via API-nøkler. Brukeren beholder pengene på sin egen Kraken-konto og kan skru av roboten eller endre risikonivå (Maks 10%, 20% eller 40% av saldo) når som helst.
- Vi støtter nå betaling i flere valutaer (NOK, EUR, USD) basert på valgt språk.
Du skal alltid svare på norsk (bokmål).
Vær pedagogisk, tålmodig og oppmuntrende.
Hvis du får spørsmål om investeringsråd, minn studenten på at dette er for utdanning og simulering, og at du ikke gir finansiell rådgivning.
Hold svarene konsise og lette å lese.`,
          },
          ...messages,
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to get response from AI", details: errorText },
        { status: response.status },
      );
    }

    // Return the stream
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API Error:", getErrorMessage(error));
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
