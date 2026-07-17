"use client";

import { useAuth } from "@/lib/auth/new/AuthContext";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, ArrowDown } from "lucide-react";

interface JokerTradeCTAProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Smart JokerTrade CTA-knapp:
 * - Innlogget → scroller til JokerTrade-dashboard
 * - Ikke innlogget → registreringsside
 * - Tekst tilpasses auth-state automatisk
 */
export function JokerTradeCTA({
  className,
  children,
}: JokerTradeCTAProps) {
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (user) {
      const el = document.getElementById("jokertrade-dashboard");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/no/jokertrade#jokertrade-dashboard");
      }
    } else {
      router.push("/no/register");
    }
  };

  const defaultContent = user ? (
    <>
      <ArrowDown className="h-5 w-5" />
      Gå til JokerTrade
      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
    </>
  ) : (
    <>
      <Sparkles className="h-5 w-5" />
      Start JokerTrade gratis
      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
    </>
  );

  return (
    <a
      href={user ? "#jokertrade-dashboard" : "/no/register"}
      onClick={handleClick}
      className={className}
    >
      {children || defaultContent}
    </a>
  );
}
