/**
 * useCSPNonce Hook
 * 
 * Provides access to the CSP nonce for client-side components.
 * Use this when you need to add inline scripts or styles with the correct nonce.
 * 
 * SECURITY NOTE: Never use this for user-generated content!
 * The nonce is only for trusted application code.
 * 
 * Usage:
 *   const nonce = useCSPNonce();
 *   return <script nonce={nonce}>...</script>;
 */

import { useState, useEffect } from "react";

/**
 * Get nonce from meta tag or header
 * The nonce is injected by middleware via X-CSP-Nonce header
 */
function getNonceFromMeta(): string | null {
  if (typeof document === "undefined") return null;
  
  // Try to get from meta tag (injected by server)
  const meta = document.querySelector('meta[name="csp-nonce"]');
  if (meta) {
    return meta.getAttribute("content");
  }
  
  return null;
}

/**
 * React hook to get the CSP nonce
 * Returns null on server, nonce string on client
 */
export function useCSPNonce(): string | null {
  const [nonce, setNonce] = useState<string | null>(null);
  
  useEffect(() => {
    const foundNonce = getNonceFromMeta();
    setNonce(foundNonce);
  }, []);
  
  return nonce;
}

/**
 * Get nonce for use outside of React components
 * Only works on client-side
 */
export function getCSPNonce(): string | null {
  return getNonceFromMeta();
}

export default useCSPNonce;
