import { redirect } from 'next/navigation';

// Redirect /kurs to default locale /no/kurs
export default function KursRedirectPage() {
  redirect('/no/kurs');
}
