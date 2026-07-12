"use client";

import { useEffect, useState } from "react";

// Root page — client-side redirect til /no
// Middleware (next-intl i18n) er ikke deployet pga worker size limit.
export default function RootPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    window.location.replace("/no");
  }, []);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[#6B7280] text-sm">Omdirigerer til Klarpakke…</p>
      </div>
    </div>
  );
}
