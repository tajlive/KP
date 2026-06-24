"use client";

import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface AuthFormFieldProps
  extends Omit<React.ComponentProps<"input">, "type" | "id" | "name"> {
  id: string;
  name: string;
  label?: string;
  type?: "text" | "email" | "password";
  error?: string;
  icon?: ReactNode;
  variant?: "public" | "admin";
}

/**
 * Reusable label + input + error component for auth forms.
 *
 * Supports an optional leading icon (used by admin flows) and two visual
 * variants so public and admin pages can share the same field structure
 * while keeping their distinct styling.
 */
export function AuthFormField({
  id,
  name,
  label,
  type = "text",
  error,
  icon,
  variant = "public",
  className,
  ...inputProps
}: AuthFormFieldProps) {
  const isAdmin = variant === "admin";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "block text-sm font-medium",
            isAdmin ? "mb-1.5 text-slate-300" : "mb-1 text-slate-300",
          )}
        >
          {label}
        </label>
      )}
      <div className={cn(icon && isAdmin && "relative")}>
        {icon && isAdmin && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </div>
        )}
        <input
          id={id}
          name={name}
          type={type}
          className={cn(
            "w-full rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
            isAdmin
              ? "border border-slate-700 bg-slate-900 py-3 pr-4 pl-10"
              : "border border-slate-800 bg-slate-950 px-4 py-3",
          )}
          {...inputProps}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export default AuthFormField;
