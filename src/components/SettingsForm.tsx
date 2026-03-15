'use client';

import { useState, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Button, Input, Card, CardHeader, CardContent, Alert } from './ui';

interface SettingsFormProps {
  userEmail?: string;
}

export default function SettingsForm({ userEmail }: SettingsFormProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        setErrorMessage('Alle felt må fylles ut');
        setIsLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setErrorMessage('Nye passord stemmer ikke overens');
        setIsLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setErrorMessage('Passord må være minst 8 tegn langt');
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setErrorMessage('Du må være logget inn for å endre passord');
        setIsLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (verifyError) {
        setErrorMessage('Gjeldende passord er feil');
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setErrorMessage('Kunne ikke oppdatere passord: ' + updateError.message);
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Passord oppdatert! Du må logge inn på nytt.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        supabase.auth.signOut();
        window.location.href = '/app/login';
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setErrorMessage('En uventet feil oppstod');
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/app/login';
  };

  return (
    <div id="settings-container" className="kp-flex kp-flex-col kp-gap-6" style={{ maxWidth: '28rem' }}>
      {/* Success message */}
      {successMessage && (
        <Alert variant="default">{successMessage}</Alert>
      )}

      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive">{errorMessage}</Alert>
      )}

      {/* Account info card */}
      <Card>
        <CardHeader />
        <CardContent>
          <div className="kp-input-group">
            <label htmlFor="user-email" className="kp-input-label">Innloggingsepost</label>
            <div
              id="user-email"
              role="textbox"
              aria-readonly="true"
              className="kp-input"
              style={{ backgroundColor: 'var(--kp-bg-secondary)', cursor: 'not-allowed' }}
            >
              {userEmail || 'Ukjent'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password change form */}
      <Card>
        <CardHeader />
        <CardContent>
          <form onSubmit={handlePasswordChange} className="kp-form">
            <Input
              id="currentPassword"
              
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
            />

            <Input
              id="newPassword"
              
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
              
            />

            <Input
              id="confirmPassword"
              
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="••••••••"
            />

            <Button
              id="change-password-btn"
              type="submit"
              variant="primary"
              loading={isLoading}
              className="kp-w-full"
            >
              Oppdater passord
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tips */}
      <Alert variant="default">
        Passord håndteres av Supabase Authentication. Du vil bli logget ut etter endring.
      </Alert>

      {/* Danger zone */}
      <Card>
        <CardHeader />
        <CardContent>
          <p className="kp-text-sm kp-text-secondary kp-mb-4">
            Logg ut av kontoen din. Du må logge inn igjen for å få tilgang.
          </p>
          <Button
            id="logout-btn"
            variant="danger"
            onClick={handleLogout}
            className="kp-w-full"
          >
            Logg ut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
