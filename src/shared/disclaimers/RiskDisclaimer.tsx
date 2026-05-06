import { AlertTriangle } from 'lucide-react'

interface RiskDisclaimerProps {
  className?: string
}

export function RiskDisclaimer({ className = '' }: RiskDisclaimerProps) {
  return (
    <div className={`bg-slate-900 border-2 border-amber-500/50 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-400 text-lg mb-2">
            Viktig risikoinformasjon
          </h3>
          <p className="text-slate-300 leading-relaxed text-base">
            Krypto er risikofylt. Verdien kan både øke og falle, og du kan tape hele 
            beløpet du setter inn. Ingenting på Klarpakke (nettsted, e-poster, kurs, 
            signaler) er personlig investeringsråd eller anbefaling. Du er selv 
            ansvarlig for alle beslutninger du tar, og bør aldri investere mer enn 
            du tåler å tape.
          </p>
        </div>
      </div>
    </div>
  )
}
