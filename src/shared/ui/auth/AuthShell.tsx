"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export type AuthMode =
  | "login"
  | "register"
  | "reset"
  | "update"
  | "admin-login"
  | "admin-forgot"
  | "admin-reset";

export interface AuthShellProps {
  mode: AuthMode;
  locale?: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const ADMIN_MODES = new Set<AuthMode>(["admin-login", "admin-forgot", "admin-reset"]);

/**
 * Mode-aware layout wrapper for all authentication pages.
 *
 * Provides a consistent centered card layout on a dark background.
 * The `locale` prop is reserved for future i18n-aware routing or metadata.
 */
export function AuthShell({
  mode,
  locale: _locale,
  children,
  className,
  "data-testid": dataTestId,
}: AuthShellProps) {
  const isAdmin = ADMIN_MODES.has(mode);

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "min-h-screen flex items-center justify-center p-4",
        isAdmin
          ? "bg-linear-to-b from-slate-950 via-slate-900 to-slate-950"
          : "bg-slate-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default AuthShell;
