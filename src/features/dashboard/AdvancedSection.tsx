"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { SURFACE } from "@/lib/design/tokens";

interface AdvancedSectionProps {
  children: React.ReactNode;
}

export function AdvancedSection({ children }: AdvancedSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-6">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full ${SURFACE.glass.medium} py-4 flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-all duration-200`}
      >
        <span className="font-medium">Avansert</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </Button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-6 space-y-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
