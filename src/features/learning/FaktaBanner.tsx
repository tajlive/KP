'use client';

import { useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Info, X, TrendingUp, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaktaBannerProps {
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
  onDismiss?: () => void;
  className?: string;
}

export function FaktaBanner({
  title = 'Fakta fra Klarpakke',
  message,
  type = 'info',
  onDismiss,
  className,
}: FaktaBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <Card 
      className={cn(
        'relative overflow-hidden border-none bg-linear-to-br from-slate-900 to-slate-800 text-white shadow-xl',
        className
      )}
    >
      {/* Dekorative elementer */}
      <div className="absolute -right-4 -top-4 opacity-10">
        <BarChart3 className="w-24 h-24" />
      </div>
      <div className="absolute -left-4 -bottom-4 opacity-10">
        <TrendingUp className="w-24 h-24" />
      </div>

      <div className="p-5 flex items-start gap-4 relative z-10">
        <div className="mt-1 p-2 bg-blue-500/20 rounded-lg text-blue-400">
          <Info className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <h4 className="font-bold text-blue-400 mb-1 flex items-center gap-2">
            {title}
          </h4>
          <p className="text-slate-300 text-sm leading-relaxed max-w-2xl">
            {message}
          </p>
        </div>

        <button 
          onClick={handleDismiss}
          className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400"
          aria-label="Lukk"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

// Ferdigdefinerte faktabannere basert på brukerens innspill
export function VolatilitetFaktaBanner({ className }: { className?: string }) {
  return (
    <FaktaBanner
      title="Strategisk Fakta"
      message="Markedet svinger naturlig opp og ned – det er en uunngåelig del av krypto. Våre algoritmer er utviklet for å navigere i disse svingningene og sikre de beste resultatene for deg som småsparer over tid."
      className={className}
    />
  );
}

export function TaalmodighetFaktaBanner({ className }: { className?: string }) {
  return (
    <FaktaBanner
      title="Gullregelen"
      message="Med tålmodighet tjener du penger. Fakta viser at de som lar veltestede strategier jobbe uforstyrret over tid, oppnår betydelig bedre resultater enn de som prøver å jage raske gevinster."
      className={className}
    />
  );
}

export function DiversifiseringFaktaBanner({ className }: { className?: string }) {
  return (
    <FaktaBanner
      title="Risikostyring"
      message="Ikke legg alle eggene i én kurv. Ved å spre investeringene dine på flere ulike kryptovalutaer og strategier, reduserer du risikoen og skaper et mer stabilt fundament for sparingen din."
      className={className}
    />
  );
}

export function MatematikkFaktaBanner({ className }: { className?: string }) {
  return (
    <FaktaBanner
      title="Objektive Fakta"
      message="Følelser er småsparerens største fiende. Vi erstatter frykt og grådighet med ren matematikk. Ved å følge objektive algoritmer fjerner vi de menneskelige feilene som ofte oppstår når markedet svinger."
      className={className}
    />
  );
}
