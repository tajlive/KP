'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function AccessibilitySettings() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [highContrast, setHighContrast] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('font_size_preference, high_contrast_mode')
            .eq('id', user.id)
            .single();

          if (data) {
            setFontSize(data.font_size_preference || 'normal');
            setHighContrast(data.high_contrast_mode || false);

            // Apply to document
            if (data.font_size_preference === 'large') {
              document.documentElement.classList.add('text-lg');
            }
            if (data.high_contrast_mode) {
              document.documentElement.classList.add('high-contrast');
            }
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function saveFontSize(size: 'normal' | 'large') {
    setFontSize(size);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ font_size_preference: size })
          .eq('id', user.id);

        // Apply to document
        if (size === 'large') {
          document.documentElement.classList.add('text-lg');
        } else {
          document.documentElement.classList.remove('text-lg');
        }
      }
    } catch (error) {
      console.error('Failed to save font size:', error);
    }
  }

  async function saveHighContrast(enabled: boolean) {
    setHighContrast(enabled);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ high_contrast_mode: enabled })
          .eq('id', user.id);

        // Apply to document
        if (enabled) {
          document.documentElement.classList.add('high-contrast');
        } else {
          document.documentElement.classList.remove('high-contrast');
        }
      }
    } catch (error) {
      console.error('Failed to save high contrast:', error);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-xl font-semibold text-white mb-6">♿ Tilgjengelighet</h3>

      <div className="space-y-8">
        {/* Font size toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Tekststørrelse</label>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => saveFontSize('normal')}
              className={`min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg font-semibold transition-colors ${fontSize === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Normal (20px)
            </button>
            <button
              onClick={() => saveFontSize('large')}
              className={`min-h-[44px] min-w-[44px] px-6 py-3 rounded-lg font-semibold transition-colors ${fontSize === 'large'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
              Stor (24px)
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            "Store bokstaver"-modus for bedre lesbarhet
          </p>
        </div>

        {/* High contrast toggle */}
        <div>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-medium text-white mb-1">Høy kontrast</div>
              <p className="text-sm text-gray-400">
                Svart bakgrunn + hvit tekst for synshemmede
              </p>
            </div>
            <button
              onClick={() => saveHighContrast(!highContrast)}
              className={`min-h-[44px] min-w-[64px] relative rounded-full transition-colors ${highContrast ? 'bg-green-600' : 'bg-gray-600'
                }`}
              aria-label={highContrast ? 'Slå av høy kontrast' : 'Slå på høy kontrast'}
            >
              <div
                className={`absolute top-1 left-1 w-8 h-8 bg-white rounded-full transition-transform ${highContrast ? 'translate-x-8' : 'translate-x-0'
                  }`}
              />
            </button>
          </label>
        </div>

        {/* Preview */}
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-lg mb-2 text-white">
            <strong>Forhåndsvisning:</strong> Dette er hvordan teksten vil se ut.
          </p>
          <p className="text-base text-gray-300">
            Normal tekst er minimum 20px for "bestemor-test" godkjenning.
          </p>
        </div>
      </div>
    </div>
  );
}
