'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

// Generate session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem('klarpakke-session');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('klarpakke-session', sessionId);
  }
  return sessionId;
};

// Get user ID if logged in
const getUserId = async () => {
  try {
    const { createClient } = await import('@/lib/utils');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
};

export function useAnalytics() {
  const pathname = usePathname();
  const sessionId = useRef(getSessionId());
  const userId = useRef<string | null>(null);

  // Get user ID on mount
  useEffect(() => {
    getUserId().then((id) => {
      userId.current = id;
    });
  }, []);

  // Track page view
  useEffect(() => {
    if (!pathname) return;
    
    const trackView = async () => {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId.current,
            user_id: userId.current,
            page_path: pathname,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
          }),
        });
      } catch (error) {
        // Silent fail for analytics
        console.debug('Analytics error:', error);
      }
    };

    trackView();
  }, [pathname]);

  // Track custom event
  const trackEvent = useCallback(async (
    eventType: string,
    metadata?: Record<string, unknown>,
    value?: number
  ) => {
    try {
      await fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId.current,
          user_id: userId.current,
          event_type: eventType,
          page_path: pathname,
          metadata,
          value,
        }),
      });
    } catch (error) {
      console.debug('Analytics error:', error);
    }
  }, [pathname]);

  // Track CTA click
  const trackCTA = useCallback((ctaName: string, location: string) => {
    trackEvent('click_cta', { cta_name: ctaName, location });
  }, [trackEvent]);

  // Track signup start
  const trackSignupStart = useCallback((plan?: string) => {
    trackEvent('start_signup', { plan });
  }, [trackEvent]);

  // Track pricing view
  const trackPricingView = useCallback(() => {
    trackEvent('view_pricing');
  }, [trackEvent]);

  return {
    trackEvent,
    trackCTA,
    trackSignupStart,
    trackPricingView,
  };
}
