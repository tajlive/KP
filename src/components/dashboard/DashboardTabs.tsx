'use client';

import { useState } from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  BookOpen,
  Bell,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  locale?: string;
}

export function DashboardTabs({ activeTab, onTabChange, locale = 'no' }: DashboardTabsProps) {
  const isNorwegian = locale === 'no';

  const tabs: Tab[] = [
    { id: 'overview', label: isNorwegian ? 'Oversikt' : 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: isNorwegian ? 'Portefølje' : 'Portfolio', icon: Wallet },
    { id: 'trading', label: isNorwegian ? 'Trading' : 'Trading', icon: TrendingUp },
    { id: 'learning', label: isNorwegian ? 'Læring' : 'Learning', icon: BookOpen },
  ];

  return (
    <div className="w-full">
      {/* Desktop: Horizontal tabs */}
      <div className="hidden md:block border-b border-white/5">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all",
                  "hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-t-lg",
                  isActive 
                    ? "text-white" 
                    : "text-slate-400 hover:bg-white/5"
                )}
              >
                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-emerald-500" />
                )}
                
                <Icon className={cn("w-4 h-4", isActive && "text-blue-400")} />
                {tab.label}
                
                {tab.badge && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile: Bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-lg border-t border-white/5 z-50">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-4 transition-all",
                  isActive ? "text-blue-400" : "text-slate-500"
                )}
              >
                <div className={cn(
                  "relative p-2 rounded-xl transition-all",
                  isActive && "bg-blue-500/10"
                )}>
                  <Icon className="w-5 h-5" />
                  {tab.badge && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Quick Stats Component
export function QuickStats({ 
  totalValue, 
  totalProfit, 
  profitPercent,
  activePositions,
  locale = 'no' 
}: { 
  totalValue: number; 
  totalProfit: number; 
  profitPercent: number;
  activePositions: number;
  locale?: string;
}) {
  const isNorwegian = locale === 'no';
  const formatNOK = (n: number) => 
    new Intl.NumberFormat(isNorwegian ? 'no-NO' : 'en-US', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
    }).format(n);

  const stats = [
    {
      label: isNorwegian ? 'Total Verdi' : 'Total Value',
      value: formatNOK(totalValue),
      subtext: `${activePositions} ${isNorwegian ? 'posisjoner' : 'positions'}`,
      color: 'text-white',
    },
    {
      label: isNorwegian ? 'Total Avkastning' : 'Total Return',
      value: formatNOK(totalProfit),
      subtext: `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(1)}%`,
      color: profitPercent >= 0 ? 'text-green-400' : 'text-red-400',
      isPositive: profitPercent >= 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-colors"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
          <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
          <p className={cn(
            "text-sm mt-1",
            stat.isPositive !== undefined 
              ? stat.isPositive ? 'text-green-400' : 'text-red-400'
              : 'text-slate-400'
          )}>
            {stat.subtext}
          </p>
        </div>
      ))}
    </div>
  );
}
