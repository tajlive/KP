"use client";

import { useEffect } from "react";

// Root page — instant client-side redirect til /no
// Middleware er ikke deployet pga worker size limit (10 MB).
export default function RootPage() {
  useEffect(() => {
    window.location.replace("/no");
  }, []);
  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center">
      <p className="text-[#6B7280] text-sm">Omdirigerer…</p>
    </div>
  );
}
