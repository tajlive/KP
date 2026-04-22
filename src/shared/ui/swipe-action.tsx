"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo, animate } from "framer-motion";
import { cn } from "@/lib/utils";

export type SwipeActionConfig = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  textColor?: string;
  onAction: () => void;
  /** If true, the action triggers immediately on swipe threshold */
  instant?: boolean;
};

interface SwipeActionProps {
  children: React.ReactNode;
  /**
   * Actions revealed when swiping left (like iOS Mail).
   * Most destructive action should be last (closest to edge).
   */
  leftActions?: SwipeActionConfig[];
  /**
   * Actions revealed when swiping right.
   */
  rightActions?: SwipeActionConfig[];
  /**
   * Threshold (in px) to trigger the first action.
   * Default: 80
   */
  threshold?: number;
  className?: string;
  /** If true, the swipe is disabled */
  disabled?: boolean;
  /** Callback when swipe state changes */
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * SwipeAction — Robinhood/Revolut-inspired swipe-to-reveal actions
 *
 * Use for: watchlist items, position rows, transaction history.
 *
 * @example
 * <SwipeAction
 *   leftActions={[
 *     { id: "close", label: "Close", icon: <X />, color: "#ef4444", onAction: handleClose },
 *   ]}
 *   rightActions={[
 *     { id: "buy", label: "Buy", icon: <Plus />, color: "#22c55e", onAction: handleBuy },
 *     { id: "sell", label: "Sell", icon: <Minus />, color: "#f59e0b", onAction: handleSell },
 *   ]}
 * >
 *   <TradingPositionRow {...position} />
 * </SwipeAction>
 */
export function SwipeAction({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  disabled = false,
  onOpenChange,
}: SwipeActionProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const leftWidth = leftActions.length * threshold;
  const rightWidth = rightActions.length * threshold;

  const background = useTransform(
    x,
    [-leftWidth - 20, 0, rightWidth + 20],
    ["rgba(239,68,68,0.1)", "rgba(0,0,0,0)", "rgba(34,197,94,0.1)"]
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (disabled) return;

    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // Fast flick
    if (velocity > 500) {
      animate(x, rightWidth, { type: "spring", stiffness: 300, damping: 30 });
      setIsOpen(true);
      onOpenChange?.(true);
      return;
    }
    if (velocity < -500) {
      animate(x, -leftWidth, { type: "spring", stiffness: 300, damping: 30 });
      setIsOpen(true);
      onOpenChange?.(true);
      return;
    }

    // Threshold-based
    if (offset > threshold / 2 && rightActions.length > 0) {
      animate(x, rightWidth, { type: "spring", stiffness: 300, damping: 30 });
      setIsOpen(true);
      onOpenChange?.(true);
    } else if (offset < -threshold / 2 && leftActions.length > 0) {
      animate(x, -leftWidth, { type: "spring", stiffness: 300, damping: 30 });
      setIsOpen(true);
      onOpenChange?.(true);
    } else {
      animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleAction = (action: SwipeActionConfig) => {
    action.onAction();
    animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
    setIsOpen(false);
    onOpenChange?.(false);
  };

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        animate(x, 0, { type: "spring", stiffness: 400, damping: 35 });
        setIsOpen(false);
        onOpenChange?.(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, x, onOpenChange]);

  return (
    <div ref={containerRef} className={cn("relative overflow-hidden", className)}>
      {/* Background actions layer */}
      <motion.div
        className="absolute inset-0 flex items-stretch justify-between"
        style={{ background }}
      >
        {/* Left actions (revealed on swipe right →) */}
        {rightActions.length > 0 && (
          <div className="flex items-stretch">
            {rightActions.map((action, i) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className="flex flex-col items-center justify-center gap-1 px-4 transition-opacity hover:opacity-90 active:opacity-75"
                style={{
                  backgroundColor: action.color,
                  width: threshold,
                }}
              >
                <span style={{ color: action.textColor || "white" }}>{action.icon}</span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: action.textColor || "white" }}
                >
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Right actions (revealed on swipe left ←) */}
        {leftActions.length > 0 && (
          <div className="flex items-stretch">
            {leftActions.map((action, i) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                className="flex flex-col items-center justify-center gap-1 px-4 transition-opacity hover:opacity-90 active:opacity-75"
                style={{
                  backgroundColor: action.color,
                  width: threshold,
                }}
              >
                <span style={{ color: action.textColor || "white" }}>{action.icon}</span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: action.textColor || "white" }}
                >
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Foreground content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: -leftWidth, right: rightWidth }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
