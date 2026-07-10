"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users } from "lucide-react";

/**
 * SocialProofBanner — viser antall tradere og samlet profit
 * Dark glassmorphism, mobil-first.
 */
export function SocialProofBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(true); }, []);

  return (
    <section
      className={`relative w-full bg-[#0A0B0D] py-6 sm:py-8 transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="glass-card flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 py-5 px-4">
          {/* Antall tradere */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20">
              <Users className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Aktive tradere</p>
              <p className="text-[#F9FAFB] font-bold text-base sm:text-lg tabular-nums">
                15<span className="text-[#9CA3AF] font-normal">+</span>
              </p>
            </div>
          </div>

          {/* Separator */}
          <div className="hidden sm:block w-px h-10 bg-[#2A2D35]" />
          <div className="block sm:hidden w-20 h-px bg-[#2A2D35]" />

          {/* Samlet profit */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Samlet profit</p>
              <p className="text-[#10B981] font-bold text-base sm:text-lg tabular-nums">
                +5.2M kr
              </p>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs sm:text-sm text-[#6B7280]">
          Bli med 15+ tradere som allerede lærer krypto
        </p>
      </div>
    </section>
  );
}
