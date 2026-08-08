'use client';

import { useState } from 'react';
import { Key, Check, AlertCircle, Loader2, Eye, EyeOff, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Kraken API-innstillinger (EU/EØS 2026 — Kraken eneste børs).
 * Nøklene lagres kryptert server-side via /api/kraken/connect (session-auth).
 * Ingen nøkler berører klient-tabellen api_keys — user_kraken_keys er SSoT.
 */
export default function KrakenAPISettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ apiKey: '', apiSecret: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  // Hent tilkoblingsstatus ved mount
  useState(() => {
    void (async () => {
      try {
        const res = await fetch('/api/trading/mode', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          setConnected(Boolean(data.krakenConnected));
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    })();
  });

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apiKey || !form.apiSecret) {
      setErrors({ form: 'API Key og Secret er påkrevd' });
      return;
    }

    setSaving(true);
    setErrors({});
    setSuccess('');
    try {
      const res = await fetch('/api/kraken/connect', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: form.apiKey, apiSecret: form.apiSecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ form: data.error || 'Kunne ikke koble til Kraken' });
        return;
      }
      setConnected(true);
      setConnectedAt(new Date().toISOString());
      setForm({ apiKey: '', apiSecret: '' });
      setSuccess('✅ Kraken-konto koblet til!');
      toast.success('Kraken tilkoblet');
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Kunne ikke koble til Kraken' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil koble fra din Kraken-konto?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/kraken/connect', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Kunne ikke koble fra');
      setConnected(false);
      setConnectedAt(null);
      toast.success('Kraken frakoblet');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Feil ved frakobling');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
        <Key className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Kraken API Innstillinger
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Koble til din Kraken-konto for automatisk trading (eneste støttede børs for norske brukere)
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Tilkoblingsstatus</h2>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Sjekker tilkobling...
          </div>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Kraken tilkoblet</p>
                <p className="text-sm text-gray-500">
                  {connectedAt
                    ? `Koblet til ${new Date(connectedAt).toLocaleString('no-NO')}`
                    : 'Klar for live-trading'}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
              title="Koble fra"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Ingen Kraken-konto tilkoblet ennå.</p>
        )}
      </div>

      {/* Connect form */}
      {!connected && (
        <form
          onSubmit={handleConnect}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700 space-y-5"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Koble til Kraken</h2>

          {errors.form && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" /> {errors.form}
            </div>
          )}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <div>
            <label htmlFor="kraken-api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              id="kraken-api-key"
              type="text"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="Skriv inn din Kraken API Key"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label htmlFor="kraken-api-secret" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Secret <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="kraken-api-secret"
                type={showSecret ? 'text' : 'password'}
                value={form.apiSecret}
                onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                placeholder="Skriv inn din Kraken API Secret"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Din API Secret krypteres (AES-256) server-side før lagring og vises aldri igjen.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !form.apiKey || !form.apiSecret}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            {saving ? 'Kobler til...' : 'Koble til sikkert'}
          </button>
        </form>
      )}

      {/* How to get keys */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Hvordan få Kraken API-nøkler
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>Logg inn på din Kraken-konto</li>
          <li>Gå til Settings → API</li>
          <li>Opprett en ny API-nøkkel (2FA kreves)</li>
          <li>Aktiver «Query funds» (lesing) og «Create & Modify Orders» (handel)</li>
          <li>Aktiver ALDRI uttaks-tillatelse</li>
          <li>Kopier både API Key og Secret og lim inn ovenfor</li>
        </ol>
        <div className="mt-4 flex items-center justify-between">
          <a
            href="https://www.kraken.com/u/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="w-4 h-4" /> Åpne Kraken API-innstillinger
          </a>
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
            ⚠️ Del aldri API-nøklene dine med noen.
          </p>
        </div>
      </div>
    </div>
  );
}
