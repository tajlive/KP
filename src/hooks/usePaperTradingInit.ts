import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function usePaperTradingInit(userId: string | undefined) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    
    const initPaperTrading = async () => {
      try {
        const response = await fetch('/api/paper-trading/init', {
          method: 'POST',
        });
        
        if (response.ok) {
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
        }
      } catch (error) {
        console.error('Failed to initialize paper trading:', error);
      }
    };

    initPaperTrading();
  }, [userId]);
}
