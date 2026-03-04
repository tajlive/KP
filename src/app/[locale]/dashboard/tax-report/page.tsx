



import { Metadata } from 'next';
import TaxReportClient from './TaxReportClient';

export const metadata: Metadata = {
  title: 'Skatterapport | Klarpakke',
  description: 'Generer skatterapport for krypto-handel',
};


export const dynamic = 'force-dynamic';

export default function TaxReportPage() {
  return <TaxReportClient />;
}
