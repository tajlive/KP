/**
 * OAuth Debug Page - Development Only
 * 
 * Visual debugging interface for Google OAuth configuration.
 * Shows redirect URIs, config status, and allows testing flows.
 * 
 * URL: /no/debug/oauth (dev only)
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { OAuthDebugClient } from "./OAuthDebugClient";

export const runtime = 'nodejs';

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "OAuth Debug - Klarpakke",
    robots: {
      index: false,
      follow: false,
    },
  };
}

// Only allow in development
export default function OAuthDebugPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  
  return <OAuthDebugClient />;
}
