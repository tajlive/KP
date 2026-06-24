import { cn } from "@/lib/utils";
import { type ReactNode } from "react";
import { type AuthMode } from "./AuthShell";

export interface AuthCardProps {
  mode?: AuthMode;
  children?: ReactNode;
  className?: string;
}

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export default AuthCard;
