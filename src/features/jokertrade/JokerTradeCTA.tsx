"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";

/**
 * Smart JokerTrade CTA-knapp.
 * Innlogget → scroll til trading-dashboard.
 * Ikke innlogget → registreringsside.
 */
export function JokerTradeCTA({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    if (user) {
      // Scroll til JokerTradeClient (data-testid="jokertrade-client")
      const el = document.querySelector('[data-testid="jokertrade-client"]');
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/no/jokertrade#trading");
      }
    } else {
      router.push("/no/register");
    }
  };

  return (
    <a
      href={user ? "#trading" : "/no/register"}
      onClick={handleClick}
      className={className}
    >
      {children || (
        <>
          <Sparkles className="w-5 h-5" />
          Start JokerTrade gratis
          <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </a>
  );
}
