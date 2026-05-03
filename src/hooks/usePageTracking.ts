'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface PageViewData {
  path: string;
  userId?: string;
  sessionId: string;
  referrer: string;
  userAgent: string;
  timeSpent: number;
}

interface TrackingEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

// Get or create visitor ID (persists across sessions)
function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  
  let visitorId = localStorage.getItem('analytics_visitor_id');
  if (!visitorId) {
    visitorId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_visitor_id', visitorId);
  }
  return visitorId;
}

// Debounce function
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Track page view
async function trackPageView(data: PageViewData) {
  try {
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: data.sessionId,
        user_id: data.userId || null,
        page_path: data.path,
        referrer: data.referrer,
        user_agent: data.userAgent,
        time_spent: data.timeSpent,
      }),
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
  }
}

// Track custom event
async function trackEvent(eventType: string, eventData: { [key: string]: unknown } = {}) {
  try {
    const sessionId = getSessionId();
    const visitorId = getVisitorId();
    
    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        visitor_id: visitorId,
        event_type: eventType,
        event_data: eventData,
        page_path: window.location.pathname,
      }),
    });
  } catch {
    /* no-op */
  }
}

export function usePageTracking() {
  const pathname = usePathname();
  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>('');
  const lastPathRef = useRef<string>('');

  // Initialize session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionIdRef.current = getSessionId();
      getVisitorId(); // Ensure visitor ID exists
    }
  }, []);

  // Track page view on path change
  useEffect(() => {
    if (!pathname || typeof window === 'undefined') return;

    // Calculate time spent on previous page
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    // Track the previous page's time spent if there was one
    if (lastPathRef.current && lastPathRef.current !== pathname) {
      trackPageView({
        path: lastPathRef.current,
        userId: user?.id,
        sessionId: sessionIdRef.current,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timeSpent,
      });
    }

    // Reset timer for new page
    startTimeRef.current = Date.now();
    lastPathRef.current = pathname;

    // Track new page view after a short delay (to ensure page is actually viewed)
    const timer = setTimeout(() => {
      trackPageView({
        path: pathname,
        userId: user?.id,
        sessionId: sessionIdRef.current,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timeSpent: 0,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname, user?.id]);

  // Track scroll depth
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let maxScrollDepth = 0;
    const milestones = [25, 50, 75, 90];
    const trackedMilestones = new Set<number>();

    const handleScroll = debounce(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;

      maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);

      // Track milestones
      milestones.forEach((milestone) => {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          trackEvent('scroll_depth', {
            depth: milestone,
            page_path: pathname,
          });
        }
      });
    }, 250);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Track time on page (heartbeat)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const heartbeatInterval = setInterval(() => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Send heartbeat every 30 seconds
      if (timeSpent > 0 && timeSpent % 30 === 0) {
        trackEvent('heartbeat', {
          page_path: pathname,
          time_spent: timeSpent,
        });
      }
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [pathname]);

  // Track before unload
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeUnload = () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Use sendBeacon for reliable tracking on page close
      if (navigator.sendBeacon) {
        const data = JSON.stringify({
          session_id: sessionIdRef.current,
          user_id: user?.id,
          page_path: pathname,
          time_spent: timeSpent,
        });
        navigator.sendBeacon('/api/analytics/track', new Blob([data], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pathname, user?.id]);

  // Return tracking utilities
  const trackClick = useCallback((elementName: string, additionalData: { [key: string]: unknown } = {}) => {
    trackEvent('click', {
      element: elementName,
      page_path: pathname,
      ...additionalData,
    });
  }, [pathname]);

  const trackConversion = useCallback((conversionType: string, value?: number) => {
    trackEvent('conversion', {
      type: conversionType,
      value,
      page_path: pathname,
    });
  }, [pathname]);

  const trackError = useCallback((errorType: string, errorMessage: string) => {
    trackEvent('error', {
      type: errorType,
      message: errorMessage,
      page_path: pathname,
      user_agent: navigator.userAgent,
    });
  }, [pathname]);

  return {
    trackEvent,
    trackClick,
    trackConversion,
    trackError,
    sessionId: sessionIdRef.current,
    visitorId: getVisitorId(),
  };
}

// Hook for tracking specific elements
export function useElementTracking(elementName: string) {
  const { trackClick } = usePageTracking();

  const onClick = useCallback(() => {
    trackClick(elementName);
  }, [elementName, trackClick]);

  return { onClick };
}

export default usePageTracking;
