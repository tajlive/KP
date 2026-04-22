"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

export type SheetHeight = "sm" | "md" | "lg" | "xl" | "full";

const HEIGHT_MAP: Record<SheetHeight, string> = {
  sm: "h-[35vh]",
  md: "h-[50vh]",
  lg: "h-[75vh]",
  xl: "h-[85vh]",
  full: "h-[95vh]",
};

interface MobileBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  height?: SheetHeight;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showDragHandle?: boolean;
  className?: string;
  snapPoints?: number[];
  /**
   * If true, the sheet will not close when clicking outside.
   * Useful for critical flows like order confirmation.
   */
  preventClose?: boolean;
}

/**
 * MobileBottomSheet — Coinbase/Robinhood-inspired bottom sheet
 *
 * Built on vaul (Radix Dialog) + framer-motion for spring physics.
 * Use for: order preview, quick actions, filters, detail views.
 *
 * @example
 * <MobileBottomSheet
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Order Preview"
 *   height="md"
 *   footer={<Button>Confirm</Button>}
 * >
 *   <OrderDetails />
 * </MobileBottomSheet>
 */
export function MobileBottomSheet({
  open,
  onOpenChange,
  title,
  description,
  height = "md",
  children,
  footer,
  showDragHandle = true,
  className,
  snapPoints,
  preventClose = false,
}: MobileBottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={preventClose && open ? () => {} : onOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={snapPoints ? snapPoints[snapPoints.length - 1] : undefined}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-2xl bg-[#0f1115] outline-none",
            HEIGHT_MAP[height],
            className
          )}
          style={{ touchAction: "pan-y" }}
        >
          <div className="flex h-full flex-col">
            {showDragHandle && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>
            )}

            {(title || description) && (
              <div className="px-5 pt-2 pb-3">
                {title && (
                  <Drawer.Title className="text-lg font-semibold text-white">
                    {title}
                  </Drawer.Title>
                )}
                {description && (
                  <Drawer.Description className="mt-1 text-sm text-white/50">
                    {description}
                  </Drawer.Description>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-2 scrollbar-hide">
              {children}
            </div>

            {footer && (
              <div className="border-t border-white/[0.06] px-5 py-4">
                {footer}
              </div>
            )}

            {/* Safe area padding for iOS */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/**
 * Animated sheet content wrapper for internal transitions
 * (e.g., switching from "preview" to "confirmation" inside the same sheet)
 */
export function SheetContentTransition({
  children,
  direction = "right",
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={React.Children.toArray(children).length > 0 ? "content" : "empty"}
        initial={{ x: direction === "right" ? 20 : -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: direction === "right" ? -20 : 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
