import { redirect } from "next/navigation";

export default async function LessonRedirect({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  redirect(`/no/kurs/leksjon/${lessonId}`);
}
