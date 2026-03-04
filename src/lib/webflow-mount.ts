'use client'

/**
 * Webflow Mounting System
 *
 * Dette modulet håndterer montering av React-komponenter
 * i Webflow root-elementer (#klarpakke-*-root)
 */

import { WEBFLOW_ROOTS } from '@/types';

export interface MountOptions {
  root: string;
  component: React.ComponentType<unknown>;
  props?: Record<string, unknown>;
}

/**
 * Finn Webflow root-element i DOM
 */
export function findWebflowRoot(rootId: string): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const element = document.getElementById(rootId);

  if (!element) {
    console.warn(`Webflow root element not found: #${rootId}`);
    return null;
  }

  return element;
}

/**
 * Sjekk om Webflow root-elementer finnes
 */
export function checkWebflowRoots(): Record<string, boolean> {
  if (typeof document === 'undefined') {
    return {};
  }
  const status: Record<string, boolean> = {};

  Object.entries(WEBFLOW_ROOTS).forEach(([key, rootId]) => {
    status[key] = !!document.getElementById(rootId as string);
  });

  return status;
}

/**
 * Logger Webflow mount status
 */
export function logWebflowStatus() {
  const status = checkWebflowRoots();
  const available = Object.values(status).filter(Boolean).length;
  const total = Object.keys(status).length;

  console.info(`[Klarpakke] Webflow roots available: ${available}/${total}`);

  Object.entries(status).forEach(([key, found]) => {
    if (found) {
      console.info(`  ✓ #${WEBFLOW_ROOTS[key as keyof typeof WEBFLOW_ROOTS]}`);
    }
  });
}

/**
 * Vent på at DOM er klar
 */
export function waitForDOM(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => resolve());

      const timer = setTimeout(() => {
        reject(new Error('DOM loading timeout'));
      }, timeout);

      // Cleanup hvis promise avbrytes
      const cleanup = () => clearTimeout(timer);
      // Lagre cleanup for eventuell fremtidig bruk
      void cleanup;
    } else {
      resolve();
    }
  });
}

/**
 * Eksportert konfigurasjonsformat for Webflow CDN-script
 */
export const MOUNT_CONFIG = {
  VERSION: '1.0.0',
  ROOTS: WEBFLOW_ROOTS,
  TIMEOUT: 5000,
};
