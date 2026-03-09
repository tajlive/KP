'use client';

import { useEffect, useState } from 'react';
import { initGlobalErrorHandling } from '@/lib/error-reporting';
import { initMonitoring } from '@/lib/monitoring';

// Initialize global error handling and monitoring
function ErrorHandlerInit() {
  useEffect(() => {
    initGlobalErrorHandling();
    initMonitoring();
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
    import("@/components/ai/ChatWidget")
      .then(m => {
        if (mounted) setChatWidget(() => m.ChatWidget);
      })
      .catch(() => {});
    
    return () => { mounted = false; };
  }, [shouldLoad]);
  
  if (!ChatWidget) return null;
  return <ChatWidget />;
}

// PWA Install Prompt loader
function PWALoader() {
  const [PWA, setPWA] = useState<React.ComponentType | null>(null);
  
  useEffect(() => {
    let mounted = true;
    import("@/components/PWAInstallPrompt")
      .then(m => {
        if (mounted) setPWA(() => m.PWAInstallPrompt);
      })
      .catch(() => {});
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
