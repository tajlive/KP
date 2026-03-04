"use client";

import { motion } from "framer-motion";
import {
  AlertCircle,
  Gift,
  Loader2,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { GoldenTicket, Ticket } from "./GoldenTicket";

export function ReferralDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/referral");
      if (!res.ok) throw new Error("Kunne ikke hente billetter");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error(error);
      toast.error("Klarte ikke laste Golden Tickets.");
    } finally {
      setLoading(false);
    }
  };

  const generateTicket = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/referral", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setTickets([data.ticket, ...tickets]);
      toast.success("Golden Ticket generert! 🎉");
    } catch (error: unknown) {
      toast.error((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const usedTickets = tickets.filter((t) => t.status !== "pending").length;
  const maxTickets = 3;
  const progressPercent = (usedTickets / maxTickets) * 100;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER & STATS */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="h-6 w-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Verv og Tjen Master-Tier
            </h2>
          </div>
          <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
            Gi vennene dine 1 måned gratis auto-trading Master-Tier. For hver
            venn som kobler seg til og begynner å handle via vår plattform, får{" "}
            <span className="text-amber-400 font-semibold">
              DU 1 ekstra måned gratis
            </span>
            . Null spam, bare verdi.
          </p>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm font-medium text-slate-300">
              Din Viral-Progresjon (Månedlig)
            </div>
            <div className="text-sm font-bold text-amber-400">
              {usedTickets} / {maxTickets} invitasjoner brukt
            </div>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800 border border-slate-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, type: "spring" }}
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
              <Users className="h-4 w-4" /> Nettverk
            </div>
            <div className="text-3xl font-bold text-white">{usedTickets}</div>
            <div className="text-xs text-slate-500">Aktive venner</div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase mb-1">
              <TrendingUp className="h-4 w-4" /> Opptjent Verdi
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {(usedTickets * 499).toLocaleString("no-NO")} kr
            </div>
            <div className="text-xs text-slate-500">
              I sparte abonnementskostnader
            </div>
          </div>
        </div>
      </div>

      {/* TICKET SECTION */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            Dine Golden Tickets
          </h3>
          <Button
            onClick={generateTicket}
            disabled={generating || tickets.length >= maxTickets}
            className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generer Ny Billett
          </Button>
        </div>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-16 text-center">
            <Gift className="mb-4 h-12 w-12 text-slate-600" />
            <h4 className="text-lg font-medium text-white">
              Ingen billetter generert ennå
            </h4>
            <p className="mt-1 text-sm text-slate-400 max-w-sm mb-6">
              Trykk på knappen over for å smi din første Golden Ticket og
              invitere en venn til Master-tier.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
              >
                <GoldenTicket ticket={ticket} />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* BINANCE AFFILIATE NOTE */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-200">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
        <p>
          <strong className="text-blue-300">
            Slik fungerer det for vennen din:
          </strong>{" "}
          Når de klikker på Golden Ticket-lenken din, vil de først opprette en
          brukerkonto. Deretter blir de bedt om å koble til Binance for å
          aktivere auto-trading. Bonusen din utløses automatisk 24 timer etter
          deres første live-trade.
        </p>
      </div>
    </div>
  );
}
