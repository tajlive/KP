import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ locale: string; lessonId: string }>;
}

// Generer statiske sider for vanlige leksjoner
export async function generateStaticParams() {
  const locales = ["no", "en"];
  const lessons = [
    "introduksjon-til-krypto",
    "hva-er-stop-loss",
    "forsta-risiko",
    "posisjonsstorrelse",
    "lese-grafer",
    "trender-og-kanaler",
    "support-og-resistance",
  ];
  
  const params = [];
  for (const locale of locales) {
    for (const lessonId of lessons) {
      params.push({ locale, lessonId });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, lessonId } = await params;
  const t = await getTranslations({ locale, namespace: "lessons" });
  
  return {
    title: `${lessonId} | Klarpakke`,
    description: t("lessonDescription"),
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { locale, lessonId } = await params;
  
  // TODO: Hent lesson data fra database/CMS
  // const lesson = await getLessonById(lessonId, locale);
  // if (!lesson) notFound();
  
  const isNorwegian = locale === "no";
  
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a 
            href={`/${locale}/kurs`}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← {isNorwegian ? "Tilbake til kurs" : "Back to courses"}
          </a>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h1 className="text-3xl font-bold text-white mb-4 capitalize">
            {lessonId.replace(/-/g, " ")}
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg">
              {isNorwegian 
                ? "Denne leksjonen er under utvikling. Sjekk tilbake snart for fullt innhold!"
                : "This lesson is under development. Check back soon for full content!"}
            </p>
            
            <div className="mt-8 p-6 bg-slate-800 rounded-xl">
              <h2 className="text-xl font-semibold text-white mb-3">
                {isNorwegian ? "Hva du vil lære:" : "What you will learn:"}
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li>• {isNorwegian ? "Grunnleggende konsepter" : "Basic concepts"}</li>
                <li>• {isNorwegian ? "Praktiske eksempler" : "Practical examples"}</li>
                <li>• {isNorwegian ? "Quiz for å teste kunnskap" : "Quiz to test knowledge"}</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4">
            <a
              href={`/${locale}/kurs`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              {isNorwegian ? "Se alle kurs" : "View all courses"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
