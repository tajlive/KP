"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

interface KlarpakkeLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
  variant?: "light" | "dark";
}

export default function KlarpakkeLogo({
  size = "md",
  showText = true,
  className = "",
  variant = "light",
}: KlarpakkeLogoProps) {
  const params = useParams();
  const locale = (params.locale as string) || "no";

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const textSizeClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <Link
      href={`/${locale}`}
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
    >
      {/* Logo Icon - Gradient K */}
      <div
        className={`${sizeClasses[size]} rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg`}
      >
        <span className="text-white font-black text-sm">K</span>
      </div>

      {/* Logo Text */}
      {showText && (
        <span
          className={`font-bold ${textSizeClasses[size]} ${variant === "dark" ? "text-white" : "text-slate-900 dark:text-white"}`}
        >
          Klarpakke
        </span>
      )}
    </Link>
  );
}

// Alternative version using the actual logo image
export function KlarpakkeLogoImage({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "light" | "dark";
}) {
  const params = useParams();
  const locale = (params.locale as string) || "no";

  return (
    <Link href={`/${locale}`} className={`flex items-center ${className}`}>
      <Image
        src="/logo.svg"
        alt="Klarpakke"
        width={130}
        height={32}
        className={`h-7 w-auto object-contain ${variant === "dark" ? "brightness-0 invert" : ""}`}
        priority
      />
    </Link>
  );
}
