"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  variant?: "dropdown" | "segmented";
  size?: "sm" | "md" | "lg";
}

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "light", label: "Lyst", icon: <Sun className="h-4 w-4" /> },
  { value: "dark", label: "Mørkt", icon: <Moon className="h-4 w-4" /> },
  { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
];

function ThemeIcon({ theme }: { theme: Theme | undefined }) {
  switch (theme) {
    case "light":
      return <Sun className="h-4 w-4" />;
    case "dark":
      return <Moon className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
}

export function ThemeToggle({ variant = "dropdown", size = "md", ...props }: ThemeToggleProps & React.ComponentProps<"div">) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={size === "lg" ? "default" : "icon"}
        className="opacity-50"
        aria-label="Toggle theme"
        disabled
      >
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === "segmented") {
    return (
      <div data-testid="theme-toggle-segmented" className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all
              ${theme === option.value
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }
            `}
            aria-label={`Set theme to ${option.label}`}
            aria-pressed={theme === option.value}
          >
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === "lg" ? "default" : "icon"}
          className="relative"
          aria-label="Toggle theme"
          data-testid="theme-toggle"
        >
          <ThemeIcon theme={theme as Theme} />
          <span className="sr-only">Bytt tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              flex items-center gap-2 cursor-pointer
              ${theme === option.value ? "bg-slate-100 dark:bg-slate-800 font-medium" : ""}
            `}
          >
            {option.icon}
            <span>{option.label}</span>
            {theme === option.value && (
              <span className="ml-auto text-xs text-slate-500">●</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export a simple icon-only toggle for compact spaces
export function ThemeToggleIcon() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="opacity-50" disabled>
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
      className="relative"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
