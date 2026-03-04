import { BookOpen, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DashboardDisclaimerProps {
  /**
   * Allow users to dismiss the banner (stored in localStorage)
   * Default: false (always visible)
   */
  dismissible?: boolean;
}

/**
 * Dashboard Disclaimer Banner - Persistent Sticky Top
 * 
 * Educational mode indicator shown at top of all dashboard pages.
 * Sticky banner that follows user as they scroll.
 * 
 * Required by Norwegian regulations to continuously remind users
 * that all trading is simulated (educational only).
 */
export function DashboardDisclaimer({ dismissible = false }: DashboardDisclaimerProps) {
  // Start with server-safe default (false)
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    setMounted(true);
    if (dismissible && typeof window !== 'undefined') {
      const stored = localStorage.getItem('klarpakke-disclaimer-dismissed') === 'true';
      setDismissed(stored);
    }
  }, [dismissible]);
  
  const handleDismiss = () => {
    if (!dismissible) return;
    
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('klarpakke-disclaimer-dismissed', 'true');
    }
  };
  
  // Prevent hydration mismatch - render nothing until mounted
  if (!mounted) {
    return (
      <div 
        className="sticky top-0 z-50 bg-blue-50 border-b-2 border-blue-200 p-3"
        role="banner"
        aria-label="Educational mode disclaimer"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              📚 Læringsmodus: All trading er simulert med virtuelle penger. Ingen ekte tap.
            </span>
          </div>
        </div>
      </div>
    );
  }
  
  if (dismissed) return null;
  
  return (
    <div 
      className="sticky top-0 z-50 bg-blue-50 border-b-2 border-blue-200 p-3"
      role="banner"
      aria-label="Educational mode disclaimer"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            📚 Læringsmodus: All trading er simulert med virtuelle penger. Ingen ekte tap.
          </span>
        </div>
        
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
            aria-label="Lukk disclaimer"
          >
            <X className="w-4 h-4 text-blue-600" />
          </button>
        )}
      </div>
    </div>
  );
}
