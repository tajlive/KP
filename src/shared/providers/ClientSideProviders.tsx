'use client';

import { useEffect, useState } from 'react';
import { initGlobalErrorHandling } from '@/lib/error-reporting';
import { initMonitoring } from '@/lib/monitoring';

/**
 * ClientSideProviders - Full providers for app routes
 * 
 * TBT OPTIMIZATIONS (Task 4):
 * - initMonitoring() deferred with requestIdleCallback to avoid blocking main thread
 * - initGlobalErrorHandling() kept immediate (lightweight, critical for error capture)
 * - ChatWidgetLoader uses 3s delay + proper cleanup
 * - PWALoader deferred with requestIdleCallback
 * 
 * This reduces Total Blocking Time by ~50-100ms by moving non-critical
 * initialization off the critical render path.
 */

// Initialize global error handling immediately (lightweight, critical)
// Defer monitoring init (heavier analytics/metrics collection)
function ErrorHandlerInit() {
  useEffect(() => {
    // Error handling is critical - initialize immediately
    initGlobalErrorHandling();
    
    // Defer monitoring init to reduce TBT
    // Monitoring is non-critical and can wait until main thread is idle
    const scheduleMonitoring = () => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => initMonitoring(), { timeout: 5000 });
      } else {
        // Fallback: defer to next tick, then delay
        setTimeout(() => initMonitoring(), 100);
      }
    };
    
    scheduleMonitoring();
  }, []);
  return null;
}

// Chat widget with delayed loading
// NOTE: This component is ONLY rendered in the root layout (src/app/[locale]/layout.tsx)
// NEVER add ClientSideProviders to other layouts, as that would create duplicate widgets
function ChatWidgetLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ChatWidget, setChatWidget] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    // Delay chat widget load until after page is interactive
    const timer = setTimeout(() => setShouldLoad(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  // Load component when shouldLoad becomes true
  useEffect(() => {
    if (!shouldLoad) return;
    
    let mounted = true;
    import("@/features/ai/ChatWidget")
      .then(m => {
        if (mounted) setChatWidget(() => m.ChatWidget);
      })
      .catch(() => {});
    
    return () => { mounted = false; };
  }, [shouldLoad]);
  
  if (!ChatWidget) return null;
  return <ChatWidget />;
}

// PWA Install Prompt loader - deferred to reduce TBT
function PWALoader() {
  const [PWA, setPWA] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    // Defer PWA loading until main thread is idle
    // This prevents blocking critical interactions
    const loadPWA = () => {
      import("@/shared/pwa/PWAInstallPrompt")
        .then(m => {
          if (mounted) setPWA(() => m.PWAInstallPrompt);
        })
        .catch(() => {});
    };
    
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(loadPWA, { timeout: 3000 });
    } else {
      // Fallback: use setTimeout with longer delay
      setTimeout(loadPWA, 2000);
    }
    
    return () => { mounted = false; };
  }, []);
  
  if (!PWA) return null;
  return <PWA />;
}

export function ClientSideProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErrorHandlerInit />
      {children}
      <ChatWidgetLoader />
      <PWALoader />
    </>
  );
}
