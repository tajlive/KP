import { redirect } from 'next/navigation';

export default function BetaPage({ params: _params }: { params: Promise<{ locale: string }> }) {
  // Redirect to beta dashboard as the main entry point
  redirect('/beta/dashboard');
}
