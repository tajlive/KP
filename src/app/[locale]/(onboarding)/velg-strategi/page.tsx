import { SetupWizard } from '@/components/strategies';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Velg Strategi | Klarpakke',
  description: 'Velg en tradingstrategi som passer deg. Vi har tre ferdige strategier tilpasset ulike risikonivåer.',
};

export function generateStaticParams() {
  return [
    { locale: 'no' },
    { locale: 'en' },
  ];
}

export default function VelgStrategiPage() {
  return (
    <main className="min-h-screen">
      <SetupWizard />
    </main>
  );
}
