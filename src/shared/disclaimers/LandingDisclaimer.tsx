interface LandingDisclaimerProps {
  language?: "no" | "en"
}

import { translations } from '@/lib/i18n/translations';

export function LandingDisclaimer({ language = "no" }: LandingDisclaimerProps) {
  const t = translations[language].disclaimers.landing;
  
  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-900 mb-2">{t.title}</h3>
            <p className="text-sm text-yellow-800">{t.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
