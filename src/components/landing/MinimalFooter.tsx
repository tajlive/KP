'use client';

import Link from 'next/link';

export function MinimalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Single row on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
          {/* Company info */}
          <div>
            <p className="font-lexend text-slate-400 text-sm">
              <strong className="text-slate-200">Klarpakke AS</strong> · Org.nr 929003292
            </p>
          </div>

          {/* Legal links */}
          <div className="flex items-center justify-center gap-6">
            <Link 
              href="/personvern" 
              className="font-lexend text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Personvern
            </Link>
            <Link 
              href="/vilkar" 
              className="font-lexend text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              Vilkår
            </Link>
            <a 
              href="mailto:support@klarpakke.no" 
              className="font-lexend text-slate-400 hover:text-slate-200 text-sm transition-colors"
            >
              support@klarpakke.no
            </a>
          </div>

          {/* Copyright */}
          <div>
            <p className="font-lexend text-slate-500 text-sm">
              © {currentYear} Klarpakke. Alle rettigheter reservert.
            </p>
          </div>
        </div>

        {/* Single disclaimer line */}
        <div className="mt-6 pt-6 border-t border-slate-800/50 text-center">
          <p className="font-lexend text-slate-500 text-xs">
            Klarpakke gir ikke finansiell rådgivning. Krypto er risikabelt. Du kan tape hele investeringen.
          </p>
        </div>
      </div>
    </footer>
  );
}
