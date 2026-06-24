"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { type AuthMode } from "./AuthShell";

export interface AuthCardHeader {
  icon?: ReactNode;
  title?: string;
  description?: string;
}

export interface AuthCardProps {
  mode?: AuthMode;
  children?: ReactNode;
  className?: string;
  header?: AuthCardHeader;
}

const ADMIN_MODES = new Set<AuthMode>(["admin-login", "admin-forgot", "admin-reset"]);

/**
 * Reusable card container for auth forms.
 *
 * Supports an optional centered header with icon/title/description for admin
 * flows, and a simpler padded layout for public flows.
 */
export function AuthCard({
  mode,
  children,
  className,
  header,
}: AuthCardProps) {
  const isAdmin = mode ? ADMIN_MODES.has(mode) : false;

  return (
    <div
      className={cn(
        "w-full max-w-md",
        isAdmin
          ? "rounded-xl border border-slate-700 bg-slate-800/50 shadow-sm"
          : "rounded-2xl border border-slate-800 bg-slate-900 p-8",
        className,
      )}
    >
      {header && (
        <div className="px-6 pt-6 pb-2 text-center">
          {header.icon && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20">
              <span className="text-blue-500">{header.icon}</span>
            </div>
          )}
          {header.title && (
            <h2 className="text-2xl font-semibold text-white">{header.title}</h2>
          )}
          {header.description && (
            <p className="mt-1 text-sm text-slate-400">{header.description}</p>
          )}
        </div>
      )}
      <div className={isAdmin ? "p-6 pt-4" : undefined}>{children}</div>
    </div>
  );
}

export default AuthCard;
