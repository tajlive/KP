import { redirect } from 'next/navigation';

export default function RegistrerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = params;
  redirect(`/${locale}/signup`);
}
