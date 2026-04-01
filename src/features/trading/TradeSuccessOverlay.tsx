"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

interface TradeSuccessOverlayProps {
  isOpen: boolean;
  symbol: string;
  amount: number;
  direction: "BUY" | "SELL";
  nokValue: number;
  onClose: () => void;
}

function CheckmarkSVG() {
  return (
    <svg
      viewBox="0 0 52 52"
      fill="none"
      className="h-14 w-14"
      aria-hidden="true"
    >
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        stroke="#22c55e"
        strokeWidth="2.5"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.path
        d="M14 26l8 8 16-16"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" }}
      />
    </svg>
  );
}

export function TradeSuccessOverlay({
  isOpen,
  symbol,
  amount,
  direction,
  nokValue,
  onClose,
}: TradeSuccessOverlayProps) {
  const [showDismiss, setShowDismiss] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    setMounted(true);

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!prefersReduced) {
      navigator.vibrate?.([50, 30, 80]);
    }

    const dismissTimer = setTimeout(() => setShowDismiss(true), 1500);
    const autoDismissTimer = setTimeout(onClose, 4000);

    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  const directionText = direction === "BUY" ? "Kjøpte" : "Solgte";
  const formattedNOK = nokValue.toLocaleString("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  });

  const overlay = (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-live="assertive"
        aria-label="Handel gjennomført"
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          backgroundColor: "oklch(0.15 0.04 145 / 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <motion.div
          className="flex max-w-[320px] flex-col items-center gap-5 px-8 text-center"
          initial={{ scale: 0.85, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 350,
            damping: 25,
            delay: 0.05,
          }}
        >
          <CheckmarkSVG />

          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-white">Handel gjennomført!</h2>
            <p className="text-base text-white/80">
              {directionText} {amount} {symbol}
            </p>
            <p className="text-lg font-semibold text-white font-tabular-nums">
              = {formattedNOK}
            </p>
            <p className="mt-1 text-xs text-white/40">
              🔒 Transaksjonen er sikret og loggført
            </p>
          </div>

          <AnimatePresence>
            {showDismiss && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={onClose}
                className="min-h-[44px] rounded-full border border-white/10 bg-white/10 px-8 py-3 text-sm font-medium text-white transition-colors active:bg-white/20"
                aria-label="Lukk bekreftelse"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Fortsett
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}
