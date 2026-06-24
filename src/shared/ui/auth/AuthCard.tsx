import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

export interface AuthCardProps {
  mode?: string;
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
