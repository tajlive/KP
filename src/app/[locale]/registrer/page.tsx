import { redirect } from 'next/navigation';

export default function RegistrerPage({ params }: { params: { locale: string } }) {
  const { locale } = params;
  redirect(`/${locale}/signup`);
}
