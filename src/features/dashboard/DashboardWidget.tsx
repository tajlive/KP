"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  id?: string;
}

/**
 * Collapsible wrapper for secondary dashboard widgets.
 * Keeps primary KPIs visible while letting users fold away
 * supporting sections.
 */
export function DashboardWidget({
  title,
  icon,
  children,
  defaultOpen = true,
  className,
  id,
}: DashboardWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className={cn("space-y-3", className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 text-left group"
        aria-expanded={isOpen}
        aria-controls={id ? `${id}-content` : undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="shrink-0 text-kp-brand">{icon}</span>
          )}
          <h3 className="font-semibold text-kp-text-primary truncate">
            {title}
          </h3>
        </div>
        <ChevronDown
          className={cn(
            "shrink-0 w-5 h-5 text-kp-text-tertiary transition-transform duration-200 group-hover:text-kp-text-secondary",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={id ? `${id}-content` : undefined}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardWidget;
