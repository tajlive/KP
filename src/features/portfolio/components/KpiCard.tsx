import { RADIUS, SHADOW } from "@/lib/design/tokens";
import type { ComponentType } from "react";
import { motion } from "framer-motion";

interface KpiCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  positive: boolean;
  index?: number;
}

export function KpiCard({ icon: Icon, label, value, positive, index = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative overflow-hidden border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 ${RADIUS.card} ${SHADOW.card} hover:border-[#0052FF]/30 transition-colors`}
    >
      <div
        aria-hidden
        className={`absolute inset-x-0 top-0 h-0.5 transition-opacity group-hover:opacity-100 ${positive ? "bg-emerald-400/80 opacity-60" : "bg-rose-400/80 opacity-60"}`}
      />
      
      {/* Background Glow on Hover */}
      <div 
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl transition-opacity opacity-0 group-hover:opacity-20 ${positive ? "bg-emerald-400" : "bg-rose-400"}`}
      />

      <div className="flex items-center gap-2 text-slate-500">
        <Icon
          className={`h-4 w-4 transition-colors ${positive ? "text-emerald-400/90 group-hover:text-emerald-400" : "text-rose-400/90 group-hover:text-rose-400"}`}
        />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500/80 group-hover:text-slate-400 transition-colors">
          {label}
        </span>
      </div>
      
      <p
        className={`mt-3 font-mono text-2xl font-bold tracking-tight transition-colors ${positive ? "text-white" : "text-rose-50"}`}
      >
        {value}
      </p>
    </motion.div>
  );
}

