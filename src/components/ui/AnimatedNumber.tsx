"use client";

import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  formatFn?: (val: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  formatFn = (val) => val.toLocaleString(),
  className = "",
  duration = 0.5,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isChanging, setIsChanging] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value === displayValue) return;
    
    setIsChanging(value > displayValue ? "up" : "down");
    
    const controls = animate(displayValue, value, {
      duration,
      ease: "easeOut",
      onUpdate(currentValue) {
        setDisplayValue(currentValue);
      },
      onComplete() {
        setIsChanging(null);
      }
    });

    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <motion.span
      suppressHydrationWarning
      className={`${className} transition-colors duration-300 ${
        isChanging === "up" ? "text-emerald-400" : isChanging === "down" ? "text-red-400" : ""
      }`}
    >
      {formatFn(displayValue)}
    </motion.span>
  );
}
