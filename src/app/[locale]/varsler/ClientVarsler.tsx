'use client';

import { useState, useEffect } from 'react';
import { Bell, BookOpen, Calendar, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations, useLocale } from 'next-intl';

interface NotificationSetting {
  id: string;
  type: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

export default function ClientVarsler() {
  const t = useTranslations('notifications');
  const locale = useLocale();
  
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'webinars',
      type: 'webinar',
      label: t('monthlyWebinars'),
      description: t('webinarsDesc'),
      enabled: true,
      icon: <Calendar className="w-5 h-5" />
    },
    {
      id: 'new-courses',
      type: 'course',
      label: locale === 'no' ? 'Nye kurs' : 'New courses',
      description: locale === 'no' ? 'Bli varslet når nye kurs moduler blir tilgjengelig' : 'Get notified when new course modules become available',
      enabled: true,
      icon: <BookOpen className="w-5 h-5" />
    },
    {
      id: 'quiz-reminders',
      type: 'quiz',
      label: locale === 'no' ? 'Quiz-påminnelser' : 'Quiz reminders',
      description: t('courseRemindersDesc'),
      enabled: false,
      icon: <Check className="w-5 h-5" />
    },
    {
      id: 'streak-reminders',
      type: 'streak',
      label: locale === 'no' ? 'Daglige streak-påminnelser' : 'Daily streak reminders',
      description: locale === 'no' ? 'Få påminnelse om å logge inn og fortsette læringen' : 'Get reminded to log in and continue learning',
      enabled: true,
      icon: <Bell className="w-5 h-5" />
    },
    {
      id: 'email-updates',
      type: 'email',
      label: locale === 'no' ? 'E-post oppdateringer' : 'Email updates',
      description: locale === 'no' ? 'Motta viktige oppdateringer via e-post' : 'Receive important updates via email',
      enabled: true,
      icon: <Mail className="w-5 h-5" />
    }
  ]);

  const [saved, setSaved] = useState(false);

  function toggleSetting(id: string) {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
    setSaved(false);
  }

  function saveSettings() {
    // Save to database (implemented in future version)
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔔 {t('title')}</h1>
          <p className="text-gray-600">
            {locale === 'no' 
              ? 'Velg hvilke påminnelser du vil motta om kurs, webinarer og læringsaktiviteter'
              : 'Choose which reminders you want to receive about courses, webinars and learning activities'}
          </p>
        </div>

        {/* Push Notifications Info */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Bell className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">{t('pushNotifications')}</h3>
                <p className="text-blue-700 text-sm">
                  {t('pushDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('settingsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.map((setting) => (
              <div 
                key={setting.id}
                className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-gray-500 mt-1">
                    {setting.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{setting.label}</h4>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(setting.id)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    setting.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    setting.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <Button onClick={saveSettings} size="lg">
            {t('save')}
          </Button>
          {saved && (
            <span className="text-green-600 font-medium">
              ✅ {t('saved')}
            </span>
          )}
        </div>

        {/* Upcoming Webinars */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {locale === 'no' ? 'Kommende webinarer' : 'Upcoming webinars'}
          </h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-2">
                      {t('forCompleteMembers')}
                    </span>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {locale === 'no' 
                        ? 'Live Q&A: Teknisk analyse for nybegynnere'
                        : 'Live Q&A: Technical analysis for beginners'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {locale === 'no' 
                        ? '15. februar 2026 kl. 19:00 • Varighet: 60 minutter'
                        : 'Feb 15, 2026 at 7:00 PM • Duration: 60 minutes'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {locale === 'no' 
                        ? 'Spørsmål om candlesticks, support/nivåer og grunnleggende indikatorer'
                        : 'Questions about candlesticks, support/levels and basic indicators'}
                    </p>
                  </div>
                  <Button variant="outline">
                    {locale === 'no' ? 'Sett påminnelse' : 'Set reminder'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-2">
                      {locale === 'no' ? 'For Pro-medlemmer' : 'For Pro members'}
                    </span>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {locale === 'no' 
                        ? 'Dypdykk: Avanserte trading-strategier'
                        : 'Deep dive: Advanced trading strategies'}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {locale === 'no' 
                        ? '1. mars 2026 kl. 19:00 • Varighet: 90 minutter'
                        : 'Mar 1, 2026 at 7:00 PM • Duration: 90 minutes'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {locale === 'no' 
                        ? 'Fibonacci, Elliott Wave og risikostyring i praksis'
                        : 'Fibonacci, Elliott Wave and risk management in practice'}
                    </p>
                  </div>
                  <Button variant="outline">
                    {locale === 'no' ? 'Sett påminnelse' : 'Set reminder'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-12 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <p className="text-sm text-yellow-800">
            <strong>{locale === 'no' ? 'Tips:' : 'Tip:'}</strong> {t('tip')}
          </p>
        </div>
      </div>
    </div>
  );
}
