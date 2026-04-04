import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Siden finnes ikke | Klarpakke Universitet',
  description: 'Siden du leter etter finnes ikke. Gå tilbake til forsiden eller utforsk våre kurs.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-8 p-8 max-w-lg">
        {/* 404 Icon */}
        <div className="relative">
          <div className="text-9xl font-black text-slate-200 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl" role="img" aria-label="Confused face">
              🤔
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Oops! Siden finnes ikke
          </h1>
          <p className="text-slate-600 leading-relaxed">
            Siden du leter etter har blitt flyttet, slettet, eller eksisterte aldri. 
            Ikke bekymre deg – vi hjelper deg videre!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/no"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Gå til forsiden
          </Link>
          <Link
            href="/no/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Logg inn
          </Link>
        </div>

        {/* Help Links */}
        <div className="pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Trenger du hjelp?{' '}
            <Link href="/no/kontakt" className="text-blue-600 hover:underline">
              Kontakt oss
            </Link>{' '}
            eller{' '}
            <Link href="/no/hjelp" className="text-blue-600 hover:underline">
              se vår hjelpesenter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
