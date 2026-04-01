"use client";

import { motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export interface Ticket {
  id: string;
  ticket_code: string;
  status:
    | "pending"
    | "account_created"
    | "binance_connected"
    | "deposit_made"
    | "rewarded";
}

interface GoldenTicketProps {
  ticket: Ticket;
}

export function GoldenTicket({ ticket }: GoldenTicketProps) {
  const [copied, setCopied] = useState(false);
  const isUsed = ticket.status !== "pending";

  const handleCopy = () => {
    // Peker på registreringssiden — nye brukere trenger ikke logg inn, de registrerer seg
    const locale = document.documentElement.lang || 'no';
    const inviteLink = `${window.location.origin}/${locale}/innlogging?ref=${ticket.ticket_code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Golden Ticket URL kopiert til utklippstavlen! ✨");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      whileHover={{ y: -5, rotateY: 5, rotateX: 5 }}
      whileTap={{ scale: 0.98 }}
      className={`relative w-full overflow-hidden rounded-2xl border p-6 transition-all duration-300 transform-gpu preserve-3d cursor-pointer ${
        isUsed
          ? "border-slate-700 bg-slate-800/50 opacity-50 grayscale"
          : "border-amber-500/30 bg-linear-to-br from-amber-900/40 via-amber-800/20 to-slate-900 shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:shadow-[0_0_50px_rgba(245,158,11,0.3)] hover:border-amber-400/50"
      }`}
      onClick={!isUsed ? handleCopy : undefined}
    >
      {!isUsed && (
        <div className="pointer-events-none absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
      )}

      {/* Gloss effect */}
      {!isUsed && (
        <div className="pointer-events-none absolute -inset-[100%] animate-[spin_8s_linear_infinite] bg-linear-to-r from-transparent via-amber-100/10 to-transparent opacity-30 blur-2xl" />
      )}

      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles
              className={`h-5 w-5 ${isUsed ? "text-slate-500" : "text-amber-400"}`}
            />
            <h3
              className={`font-bold tracking-widest uppercase text-sm ${isUsed ? "text-slate-500" : "text-amber-400"}`}
            >
              The Golden Ticket
            </h3>
          </div>
          <span
            className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
              isUsed
                ? "bg-slate-800 border-slate-700 text-slate-500"
                : "bg-amber-950/50 border-amber-500/30 text-amber-200"
            }`}
          >
            {ticket.ticket_code}
          </span>
        </div>

        <div>
          <p
            className={`text-sm mb-4 ${isUsed ? "text-slate-500" : "text-slate-300"}`}
          >
            {isUsed
              ? "Denne billetten er allerede brukt av en venn."
              : "Gir 1 gratis måned med Master-tier auto-trading."}
          </p>

          {!isUsed ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-colors">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Kopiert!" : "Kopier magisk lenke"}
            </div>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800/50 border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-500">
              <Check className="h-4 w-4" /> Innleyst
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
