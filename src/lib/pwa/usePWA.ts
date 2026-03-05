"use client";

import { useCallback, useEffect, useState } from "react";

// Type declaration for BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  installPrompt: () => Promise<void>;
}

export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt
    // Note: We do NOT call preventDefault() here to allow the native banner to show
    // The browser will automatically show the banner when criteria are met
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.info("Got beforeinstallprompt event");
      // Store the event for custom install button, but don't prevent default
      // This allows both native banner AND custom button to work
      setDeferredPrompt(e);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      console.info("App was installed");
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    // Listen for online/offline
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Initial offline state
    setIsOffline(!navigator.onLine);

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as unknown as Parameters<
        typeof window.addEventListener
      >[1],
    );
    window.addEventListener(
      "appinstalled",
      handleAppInstalled as unknown as Parameters<
        typeof window.addEventListener
      >[1],
    );
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as unknown as Parameters<
          typeof window.addEventListener
        >[1],
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const installPrompt = useCallback(async () => {
    if (!deferredPrompt) {
      console.info("No install prompt available");
      return;
    }

    // Show the native install prompt
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.info("User accepted install prompt");
    } else {
      console.info("User dismissed install prompt");
    }

    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isOffline,
    installPrompt,
  };
}
