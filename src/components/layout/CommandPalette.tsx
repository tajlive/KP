"use client";

import {
  BookOpen,
  Calculator,
  LayoutDashboard,
  Search,
  Settings,
  Target,
  Terminal,
  TrendingUp,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const commands = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "trading",
    label: "Live Trading",
    icon: TrendingUp,
    href: "/beta/live-trading",
  },
  { id: "simulator", label: "Simulator", icon: BookOpen, href: "/simulator" },
  {
    id: "paper-trading",
    label: "Lekepenger",
    icon: Target,
    href: "/paper-trading",
  },
  {
    id: "calculator",
    label: "Profit Kalkulator",
    icon: Calculator,
    href: "/kalkulator",
  },
  {
    id: "settings",
    label: "Innstillinger",
    icon: Settings,
    href: "/dashboard/settings",
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const getLocale = () => {
    const match = (pathname ?? "/").match(/^\/([a-z]{2})/);
    return match ? match[1] : "no";
  };
  const locale = getLocale();

  const toggle = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) setQuery("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        // Only open if not typing in an input
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        )
          return;

        e.preventDefault();
        toggle(true);
      }
      if (e.key === "Escape") toggle(false);

      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex(
            (prev) =>
              (prev - 1 + filteredCommands.length) % filteredCommands.length,
          );
        }
        if (e.key === "Enter") {
          const cmd = filteredCommands[selectedIndex];
          if (cmd) {
            router.push(`/${locale}${cmd.href}`);
            toggle(false);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, toggle, router, locale]);

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-black/60">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- dialog panel stops propagation for click/key */}
      <div
        className="w-full max-w-xl bg-slate-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative flex items-center p-4 border-b border-white/5">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={(el) => el?.focus()}
            aria-label="Søk etter verktøy, sider eller kommandoer"
            className="flex-1 bg-transparent border-none text-white outline-none placeholder:text-slate-500 text-lg"
            placeholder="Søk etter verktøy, sider eller kommandoer..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-slate-500">
            ESC
          </kbd>
          <button
            onClick={() => toggle(false)}
            className="ml-2 p-1 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Lukk"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  router.push(`/${locale}${cmd.href}`);
                  toggle(false);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer ${
                  selectedIndex === idx
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:bg-white/5"
                }`}
                aria-label={cmd.label}
              >
                <cmd.icon
                  className={`w-5 h-5 ${selectedIndex === idx ? "text-white" : "text-slate-500"}`}
                />
                <span className="font-medium">{cmd.label}</span>
                {selectedIndex === idx && (
                  <kbd className="ml-auto text-xs opacity-60">ENTER</kbd>
                )}
              </button>
            ))
          ) : (
            <div className="py-12 text-center">
              <Terminal className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Ingen treff for "{query}"</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 italic">
          <span>Tips: Bruk piltastene for å navigere</span>
          <span>Blyt AS Modern Console</span>
        </div>
      </div>
      <div
        className="fixed inset-0 -z-10"
        role="button"
        tabIndex={0}
        aria-label="Lukk"
        onClick={() => toggle(false)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(false); } }}
      />
    </div>
  );
}
