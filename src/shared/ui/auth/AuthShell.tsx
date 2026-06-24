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
  children: ReactNode;
  className?: string;
}

export function AuthShell({
  mode: _mode,
  children,
  className,
}: AuthShellProps) {
  // `_mode` is reserved to drive mode-specific copy/links in the full implementation.
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background p-4", className)}>
      {children}
    </div>
  );
}

export default AuthShell;
