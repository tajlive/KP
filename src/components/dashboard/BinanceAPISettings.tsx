'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/utils';
import { encryptData, maskApiKey } from '@/lib/crypto/encrypt';
import { getErrorMessage } from '@/lib/utils/error';
import { Key, Check, X, AlertCircle, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  exchange: string;
  label: string;
  api_key: string;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: 'success' | 'failed' | 'pending' | null;
  test_error: string | null;
  permissions: {
    spot?: boolean;
    futures?: boolean;
    margin?: boolean;
  };
}

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
}

export default function BinanceAPISettings({ user }: { user: UserData }) {
  const supabase = createClient();

  // State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form state
  const [form, setForm] = useState({
    label: 'Hovedkonto',
    apiKey: '',
    apiSecret: '',
    testnet: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  // Load existing API keys
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('exchange', 'binance')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data || []) as ApiKey[]);
    } catch (error: unknown) {
      console.error('Error loading API keys:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const testCredentials = async () => {
    if (!form.apiKey || !form.apiSecret) {
      setErrors({ apiKey: 'API Key og Secret er påkrevd' });
      return null;
    }

    setTesting(true);
    setErrors({});
    setSuccess('');

    try {
      const response = await fetch('/api/binance/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: form.apiKey,
          apiSecret: form.apiSecret,
          testnet: form.testnet,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setErrors({ test: data.error || 'Kunne ikke koble til Binance' });
        return null;
      }

      setSuccess('✅ Tilkobling vellykket!');
      return data.accountInfo;
    } catch (error: unknown) {
      setErrors({ test: getErrorMessage(error) });
      return null;
    } finally {
      setTesting(false);
    }
  };

  const saveApiKey = async () => {
    const accountInfo = await testCredentials();
    if (!accountInfo) return;

    setLoading(true);
    try {
      const encryptedSecret = await encryptData(form.apiSecret);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ikke logget inn');

      const { error } = await supabase.from('api_keys').insert({
        user_id: user.id,
        exchange: form.testnet ? 'binance_testnet' : 'binance',
        label: form.label,
        api_key: form.apiKey,
        api_secret: encryptedSecret,
        is_active: true,
        last_tested_at: new Date().toISOString(),
        test_status: 'success',
        permissions: {
          spot: accountInfo.permissions?.includes('SPOT') || false,
          futures: accountInfo.permissions?.includes('FUTURES') || false,
          margin: accountInfo.permissions?.includes('MARGIN') || false,
        },
      } as any);

      if (error) throw error;

      setForm({ label: 'Hovedkonto', apiKey: '', apiSecret: '', testnet: false });
      await loadApiKeys();
      setSuccess('✅ API-nøkkel lagret!');
    } catch (error: unknown) {
      setErrors({ save: getErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne API-nøkkelen?')) return;

    try {
      const { error } = await supabase.from('api_keys').delete().eq('id', id);
      if (error) throw error;
      await loadApiKeys();
    } catch (error: unknown) {
      toast.error('Feil ved sletting: ' + getErrorMessage(error));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 pb-6 border-b border-gray-200 dark:border-gray-700">
        <Key className="w-8 h-8 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Binance API Innstillinger
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Koble til din Binance-konto for automatisk trading
          </p>
        </div>
      </div>

      {/* Add New API Key Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); saveApiKey(); }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
          Legg til ny API-nøkkel
        </h2>

        <div className="space-y-5">
          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Merkelapp (valgfritt)
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="F.eks. Hovedkonto, Testkonto"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder="Skriv inn din Binance API Key"
              className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border ${
                errors.apiKey ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm`}
            />
            {errors.apiKey && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.apiKey}
              </p>
            )}
          </div>

          {/* API Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Secret <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={form.apiSecret}
                onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                placeholder="Skriv inn din Binance API Secret"
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Testnet Toggle */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <input
              type="checkbox"
              id="testnet"
              checked={form.testnet}
              onChange={(e) => setForm({ ...form, testnet: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="testnet" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Bruk Binance Testnet (for testing)
            </label>
          </div>

          {/* Messages */}
          {errors.test && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{errors.test}</span>
              </p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 text-sm flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>{success}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={testCredentials}
              disabled={testing || loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Tester...</>
              ) : (
                <><AlertCircle className="w-5 h-5" /> Test Tilkobling</>
              )}
            </button>

            <button
              type="submit"
              disabled={testing || loading || !form.apiKey || !form.apiSecret}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Lagrer...</>
              ) : (
                <><Check className="w-5 h-5" /> Lagre API-nøkkel</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Existing API Keys */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
          Dine API-nøkler
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Key className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Ingen API-nøkler lagt til ennå</p>
            <p className="text-sm mt-2">Legg til din første API-nøkkel ovenfor</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  {key.test_status === 'success' ? (
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{key.label}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {maskApiKey(key.api_key)}
                    </p>
                    {key.last_tested_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Sist testet: {new Date(key.last_tested_at).toLocaleString('no-NO')}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  title="Slett"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How to Get API Keys */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">
          Hvordan få Binance API-nøkler
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <li>Logg inn på din Binance-konto</li>
          <li>Gå til Profil → API Management</li>
          <li>Opprett en ny API-nøkkel</li>
          <li>Fullfør 2FA-verifisering</li>
          <li>Kopier både API Key og Secret Key</li>
          <li>Aktiver "Spot & Margin Trading" tillatelse</li>
          <li>Lim inn over og test tilkoblingen</li>
        </ol>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-4 font-medium">
          ⚠️ Del aldri API-nøklene dine med noen. Hold dem sikre.
        </p>
      </div>
    </div>
  );
}
