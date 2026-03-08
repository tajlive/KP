import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

// Redirect /kurs/leksjon/[lessonId] to /no/kurs/leksjon/[lessonId]
export default async function LessonRedirectPage({ params }: PageProps) {
  const { lessonId } = await params;
  redirect(`/no/kurs/leksjon/${lessonId}`);
}
