'use client';

import { useState, useEffect } from 'react';
import { ConnectBinanceModal } from '@/components/modals/ConnectBinanceModal';

export function ModalProvider() {
  const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenBinanceModal = () => {
      setIsBinanceModalOpen(true);
    };

    window.addEventListener('open-binance-connect-modal', handleOpenBinanceModal);
    
    return () => {
      window.removeEventListener('open-binance-connect-modal', handleOpenBinanceModal);
    };
  }, []);

  return (
    <ConnectBinanceModal 
      isOpen={isBinanceModalOpen} 
      onClose={() => setIsBinanceModalOpen(false)} 
    />
  );
}
