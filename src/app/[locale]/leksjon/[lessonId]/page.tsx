import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

interface PageProps {
  params: Promise<{ locale: string; lessonId: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId, locale } = await params;
  const t = await getTranslations({ locale, namespace: "courses" });

  const title = lessonId.replace(/-/g, " ");

  return {
    title: `${title} | ${t("title")}`,
    description: t("description"),
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { lessonId, locale } = await params;
  const _t = await getTranslations({ locale, namespace: "courses" });

  const isEnglish = locale === "en";

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link
            href={`/${locale}/kurs`}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← {isEnglish ? "Back to courses" : "Tilbake til kurs"}
          </Link>
        </div>

        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h1 className="text-3xl font-bold text-white mb-4 capitalize">
            {lessonId.replace(/-/g, " ")}
          </h1>

          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg">
              {isEnglish
                ? "This lesson is under development. Check back soon for full content!"
                : "Denne leksjonen er under utvikling. Sjekk tilbake snart for fullt innhold!"}
            </p>

            <div className="mt-8 p-6 bg-slate-800 rounded-xl">
              <h2 className="text-xl font-semibold text-white mb-3">
                {isEnglish ? "What you will learn:" : "Hva du vil lære:"}
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li>• {isEnglish ? "Basic concepts" : "Grunnleggende konsepter"}</li>
                <li>• {isEnglish ? "Practical examples" : "Praktiske eksempler"}</li>
                <li>• {isEnglish ? "Quiz to test knowledge" : "Quiz for å teste kunnskap"}</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <Link
              href={`/${locale}/kurs`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              {isEnglish ? "See all courses" : "Se alle kurs"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
