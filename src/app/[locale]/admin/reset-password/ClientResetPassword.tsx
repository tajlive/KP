'use client';

import { useState, useEffect } from 'react';

import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/utils';

export default function ClientResetPassword() {

  const locale = useLocale();
  const t = useTranslations('admin');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase handles the token from the URL hash automatically
    // When the user clicks the reset link, Supabase sets up a session
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setSessionValid(true);
        } else {
          setError('Ugyldig eller utløpt lenke. Be om en ny tilbakestillingslenke.')
        }
      } catch {
        setError('Kunne ikke verifisere lenken')
      } finally {
        setVerifying(false)
      }
    }

    checkSession()
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passordene matcher ikke');
      return;
    }

    if (password.length < 8) {
      setError('Passordet må være minst 8 tegn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);
    } catch (_err) {
      setError('En feil oppstod. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-slate-400">Verifiserer lenken...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle className="text-white text-2xl">Passord oppdatert!</CardTitle>
            <CardDescription className="text-slate-400">
              Ditt nye passord er nå aktivt. Du kan logge inn med en gang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              asChild
            >
              <a href={`/${locale}/admin/login`}>
                Logg inn nå
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !sessionValid) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-600/20 rounded-xl flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle className="text-white text-2xl">Ugyldig lenke</CardTitle>
            <CardDescription className="text-slate-400">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-slate-600 text-slate-300"
              asChild
            >
              <a href={`/${locale}/admin/forgot-password`}>
                Be om ny lenke
              </a>
            </Button>
            <div className="text-center">
              <a
                href={`/${locale}/admin/login`}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbake til login
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle className="text-white text-2xl">{t('resetPassword')}</CardTitle>
          <CardDescription className="text-slate-400">
            {t('choosePassword')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-reset-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Nytt passord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="admin-reset-password"
                  type="password"
                  placeholder="--------"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-reset-confirm" className="block text-sm font-medium text-slate-300 mb-1.5">
                Gjenta nytt passord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="admin-reset-confirm"
                  type="password"
                  placeholder="--------"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oppdaterer...
                </>
              ) : (
                'Lagre nytt passord'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
