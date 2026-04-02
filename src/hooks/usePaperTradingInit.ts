import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';

export function usePaperTradingInit(userId: string | undefined) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    
    const initPaperTrading = async () => {
      try {
        // Use apiFetch to get automatic 401 handling
        const response = await apiFetch('/api/paper-trading/init', {
          method: 'POST',
        });
        
        // If apiFetch redirects on 401, we won't reach here
        if (!response.ok) {
          // Handle other errors
          const errorText = await response.text();
          console.error('[PaperTrading] Init failed:', errorText);
          return;
        }
        
        const data = await response.json();
        
        // Only show toast if this is a new session (created within last minute)
        const createdAt = new Date(data.session.created_at);
        const now = new Date();
        const isNew = (now.getTime() - createdAt.getTime()) < 60000;
        
        if (isNew) {
          toast.success('Paper trading aktivert!', {
            description: `Du har fått kr 100,000 i virtuell kapital å øve med.`,
            duration: 5000,
          });
        }
        
        initialized.current = true;
      } catch (error) {
        // Don't show error toast - apiFetch handles 401 redirects
        console.error('[PaperTrading] Init error:', error);
      }
    };

    initPaperTrading();
  }, [userId]);
}
