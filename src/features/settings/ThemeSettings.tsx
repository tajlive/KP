"use client";

import { useThemePreference, type ThemePreference } from "@/lib/hooks/useThemePreference";
import { useState, useEffect } from "react";
import { Monitor, Sun, Moon, Check } from "lucide-react";

const themeOptions: { 
  value: ThemePreference; 
  label: string; 
  description: string;
  icon: React.ReactNode;
}[] = [
  { 
    value: "system", 
    label: "System", 
    description: "Følger enhetens innstillinger",
    icon: <Monitor className="w-5 h-5" /> 
  },
  { 
    value: "light", 
    label: "Lyst", 
    description: "Lys bakgrunn med mørk tekst",
    icon: <Sun className="w-5 h-5" /> 
  },
  { 
    value: "dark", 
    label: "Mørkt", 
    description: "Mørk bakgrunn med lys tekst",
    icon: <Moon className="w-5 h-5" /> 
  },
];

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useThemePreference();
  const [mounted, setMounted] = useState(false);

  // Unngå hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        {themeOptions.map((option) => (
          <div
            key={option.value}
            className="flex items-center gap-4 p-4 rounded-xl border border-kp-border bg-kp-bg-secondary/50 opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-kp-bg-tertiary flex items-center justify-center">
              {option.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-kp-text-secondary">{option.label}</p>
              <p className="text-sm text-kp-text-muted">{option.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {themeOptions.map((option) => {
        const isSelected = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
              ${isSelected 
                ? "border-kp-brand/50 bg-kp-brand-subtle" 
                : "border-kp-border bg-kp-bg-secondary/50 hover:border-kp-border-dark hover:bg-kp-bg-tertiary/50"
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center transition-colors
              ${isSelected ? "bg-kp-brand text-white" : "bg-kp-bg-tertiary text-kp-text-tertiary"}
            `}>
              {option.icon}
            </div>
            
            <div className="flex-1 text-left">
              <p className={`font-medium ${isSelected ? "text-kp-text-primary" : "text-kp-text-secondary"}`}>
                {option.label}
              </p>
              <p className="text-sm text-kp-text-muted">
                {option.description}
              </p>
            </div>

            {isSelected && (
              <div className="flex items-center gap-1.5 text-kp-brand">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Valgt</span>
              </div>
            )}
          </button>
        );
      })}

      {/* Preview av nåværende tema */}
      <div className="mt-4 p-4 rounded-xl bg-kp-bg-primary border border-kp-border">
        <p className="text-xs text-kp-text-muted uppercase tracking-wider mb-2">Forhåndsvisning</p>
        <div className="flex items-center gap-2">
          <div className={`
            w-3 h-3 rounded-full
            ${resolvedTheme === "dark" ? "bg-kp-brand" : "bg-amber-400"}
          `} />
          <span className="text-sm text-kp-text-secondary">
            {resolvedTheme === "dark" ? "Mørk modus aktiv" : "Lys modus aktiv"}
          </span>
        </div>
      </div>
    </div>
  );
}
