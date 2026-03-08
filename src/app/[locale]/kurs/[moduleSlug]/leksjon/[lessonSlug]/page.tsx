import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; moduleSlug: string; lessonSlug: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/kurs`);
}
