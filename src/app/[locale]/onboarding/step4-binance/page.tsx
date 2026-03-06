'use client';
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingStep4() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSkip = async () => {
    setLoading(true);
    router.push("/onboarding/step5-complete");
  };

  const handleConnect = () => {
    // Redirect to settings with binance tab and return to onboarding
    router.push(
      "/innstillinger?tab=exchange&onboarding=true&returnTo=/onboarding/step5-complete"
    );
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Koble til Binance</CardTitle>
        <CardDescription>
          Nødvendig for live trading, men kan hoppes over for nå
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Hvorfor Binance?
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>✓ Laveste handelsgebyr i markedet</li>
              <li>✓ Høy likviditet på alle par</li>
              <li>✓ Trygt API-basert system</li>
              <li>✓ Dine nøkler lagres kryptert</li>
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Hvordan koble til:</h4>
            <ol className="text-sm space-y-2 text-muted-foreground">
              <li>1. Logg inn på Binance</li>
              <li>2. Gå til API Management</li>
              <li>3. Opprett ny API-nøkkel</li>
              <li>4. Kopier API Key og Secret til Klarpakke</li>
            </ol>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Har du ikke Binance-konto ennå?
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a
                href="https://www.binance.com/register"
                target="_blank"
                rel="noopener noreferrer"
              >
                Opprett Binance-konto
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding/step3-trading-mode")}
            className="flex-1"
          >
            ← Tilbake
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1"
          >
            Hopp over
          </Button>
          <Button onClick={handleConnect} className="flex-1">
            Koble til →
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Du kan alltid koble til Binance senere fra innstillinger
        </p>
      </CardContent>
    </Card>
  );
}
