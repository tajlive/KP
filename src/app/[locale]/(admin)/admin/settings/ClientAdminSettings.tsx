'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Shield, User, AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils/error';
import { User as SupabaseUser } from '@supabase/supabase-js';

export default function ClientAdminSettings() {
  const locale = useLocale();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  const fetchUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (err) {
      console.error('Failed to fetch user:', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passordene matcher ikke');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Passordet må være minst 8 tegn');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Passordet er oppdatert');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      router.push(`/${locale}/admin/login`);
    } catch (err) {
      console.error('Failed to logout:', getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Innstillinger</h1>
        <p className="text-slate-400">Administrer din admin-konto</p>
      </div>

      {/* Profile Info */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Profilinformasjon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">E-post</Label>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <div>
              <Label className="text-slate-400">Rolle</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {user?.user_metadata?.role || 'admin'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Sist innlogget</Label>
              <p className="text-white">
                {user?.last_sign_in_at 
                  ? new Date(user.last_sign_in_at).toLocaleString('no-NO') 
                  : 'Ukjent'}
              </p>
            </div>
            <div>
              <Label className="text-slate-400">Konto opprettet</Label>
              <p className="text-white">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleString('no-NO') 
                  : 'Ukjent'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-yellow-400" />
            Endre passord
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-slate-300">
                Nytt passord
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="Minst 8 tegn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-slate-300">
                Bekreft nytt passord
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
                placeholder="Skriv passordet igjen"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                ✓ {passwordSuccess}
              </div>
            )}

            <Button
              type="submit"
              disabled={isUpdating || !newPassword || !confirmPassword}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {isUpdating ? 'Oppdaterer...' : 'Oppdater passord'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Actions */}
      <Card className="border-red-500/20 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Sikkerhetshandlinger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white font-medium">Logg ut fra alle enheter</p>
              <p className="text-slate-400 text-sm">
                Dette vil logge deg ut fra alle aktive sesjoner
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleLogoutAllSessions}
              className="bg-red-600 hover:bg-red-500"
            >
              Logg ut alle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Sikkerhetstips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>Bruk et unikt passord for admin-kontoen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>Logg ut når du er ferdig med admin-arbeidet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>Ikke del admin-passordet med noen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>Sjekk systemstatus jevnlig for uvanlig aktivitet</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
