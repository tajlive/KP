import { redirect } from "next/navigation";

export default function LessonRedirect({
  params,
}: {
  params: { lessonId: string };
}) {
  redirect(`/no/kurs/leksjon/${params.lessonId}`);
}
