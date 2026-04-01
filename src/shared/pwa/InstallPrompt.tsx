"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/shared/ui/button";

/**
 * PWA Install Prompt
 * Viser "Legg til på hjemskjerm"-prompt for iOS og Android
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setIsInstalled(true);

      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (isIOSDevice) {
      const hasSeenPrompt = localStorage.getItem("kp-install-prompt-seen");
      if (!hasSeenPrompt) {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    if (isIOS) {
      localStorage.setItem("kp-install-prompt-seen", "true");
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem("kp-install-prompt-seen", "true");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    setShowPrompt(false);
    localStorage.setItem("kp-install-prompt-seen", "true");
  };

  if (isInstalled) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe"
        >
          <div className="max-w-md mx-auto">
            <div className="bg-[#161719] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-white">Klarpakke App</span>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors"
                  aria-label="Lukk"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-4 pt-3">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {isIOS ? "Legg til på hjemskjerm" : "Installer appen"}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  {isIOS
                    ? "Trykk på dele-knappen og velg 'Legg til på hjemskjerm' for rask tilgang."
                    : "Få raskere tilgang og bedre opplevelse med appen på hjemskjermen."}
                </p>

                {isIOS && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                      <span className="text-lg">📤</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-300">
                        1. Trykk <strong>dele-knappen</strong> nedenfor
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        2. Velg <strong>"Legg til på hjemskjerm"</strong>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDismiss}
                    className="flex-1 h-12 bg-transparent border-white/10 text-gray-300 hover:bg-white/5 hover:text-white"
                  >
                    Ikke nå
                  </Button>
                  {!isIOS && (
                    <Button
                      onClick={handleInstall}
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Installer
                    </Button>
                  )}
                  {isIOS && (
                    <Button
                      onClick={handleDismiss}
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-medium"
                    >
                      Forstått
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for å registrere service worker
 */
export function useServiceWorker() {
  const [isReady, setIsReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setError(new Error("Service Worker not supported"));
      return;
    }

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[PWA] Service Worker registered:", registration.scope);
        setIsReady(true);
      })
      .catch((err) => {
        console.error("[PWA] Service Worker registration failed:", err);
        setError(err);
      });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isReady, isOffline, error };
}

/**
 * Offline-indikator
 */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      exit={{ y: -50 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-black px-4 py-2 text-center text-sm font-medium"
    >
      <span className="mr-2">📡</span>
      Du er offline. Noen funksjoner kan være begrenset.
    </motion.div>
  );
}
