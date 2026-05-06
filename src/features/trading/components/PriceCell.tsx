import { Lock } from "lucide-react";

interface PriceCellProps {
  label: string;
  value: number | null;
  visible: boolean;
  lockedLabel: string;
}

export function PriceCell({ label, value, visible, lockedLabel }: PriceCellProps) {
  return (
    <div className="bg-kp-bg-secondary rounded-md px-2.5 py-1.5 border border-kp-border">
      <p className="text-[9px] uppercase text-kp-text-muted font-bold tracking-wider">
        {label}
      </p>
      {visible ? (
        <p className="text-xs font-mono font-semibold text-kp-text-primary truncate">
          {value != null ? `$${value.toLocaleString("en-US")}` : "—"}
        </p>
      ) : (
        <div className="flex items-center gap-1 text-kp-text-muted">
          <Lock className="w-3 h-3" />
          <span className="text-[10px] font-medium">{lockedLabel}</span>
        </div>
      )}
    </div>
  );
}
