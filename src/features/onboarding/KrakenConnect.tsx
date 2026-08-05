"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface KrakenConnectProps {
  userId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function KrakenConnect({ userId, onSuccess, onError }: KrakenConnectProps) {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const router = useRouter();

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) {
      onError?.("Vennligst fyll inn begge feltene");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/kraken/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, apiKey, apiSecret }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Tilkobling feilet");
      }

      onSuccess?.();
      router.refresh();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Ukjent feil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-sm border">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Koble til Kraken</h2>
        <p className="text-gray-600 mt-2">
          Lim inn API-nøklene dine for automatisk trading
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            id="apiKey"
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Din Kraken API-nøkkel"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700 mb-1">
            API Secret
          </label>
          <input
            id="apiSecret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Din Kraken API-hemmelighet"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleConnect}
          disabled={loading}
          className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Kobler til..." : "Koble til Kraken"}
        </button>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Slik finner du API-nøklene:</h3>
        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
          <li>Logg inn på Kraken</li>
          <li>Gå til Settings → API</li>
          <li>Klikk "Generate New Key"</li>
          <li>Velg "Query" + "Trade" tillatelser</li>
          <li>Kopier nøklene hit</li>
        </ol>
      </div>
    </div>
  );
}
