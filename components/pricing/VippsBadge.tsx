"use client";

import { CreditCard } from "lucide-react";

export function VippsBadge() {
  return (
    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-white/50">
      <span className="flex items-center gap-1">
        <CreditCard className="w-3 h-3" />
        Kort
      </span>
      <span className="text-white/30">|</span>
      <span className="flex items-center gap-1">
        {/* Vipps farge: #FF5B24 */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-3 h-3" 
          fill="#FF5B24"
        >
          <path d="M17.707 3.63c-.566-.562-1.492-.562-2.058 0l-8.05 8c-.566.562-.566 1.472 0 2.034.566.562 1.492.562 2.058 0l8.05-8c.566-.562.566-1.472 0-2.034z"/>
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm5.707 10.298c-.566.562-1.492.562-2.058 0l-2.27-2.252-2.27 2.252c-.566.562-1.492.562-2.058 0-.566-.562-.566-1.472 0-2.034l3.299-3.273c.566-.562 1.492-.562 2.058 0l3.299 3.273c.566.562.566 1.472 0 2.034z"/>
        </svg>
        <span className="text-[#FF5B24] font-medium">Vipps</span>
      </span>
    </div>
  );
}
