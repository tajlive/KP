import { Metadata } from "next";

interface PageProps {
  params: Promise<{ lessonId: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  
  return {
    title: `${lessonId} | Klarpakke`,
    description: "Leksjon - Klarpakke Universitet",
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { lessonId } = await params;
  
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <a 
            href="/kurs"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Tilbake til kurs
          </a>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
          <h1 className="text-3xl font-bold text-white mb-4 capitalize">
            {lessonId.replace(/-/g, " ")}
          </h1>
          
          <div className="prose prose-invert max-w-none">
            <p className="text-slate-300 text-lg">
              Denne leksjonen er under utvikling. Sjekk tilbake snart for fullt innhold!
            </p>
            
            <div className="mt-8 p-6 bg-slate-800 rounded-xl">
              <h2 className="text-xl font-semibold text-white mb-3">
                Hva du vil lære:
              </h2>
              <ul className="space-y-2 text-slate-300">
                <li>• Grunnleggende konsepter</li>
                <li>• Praktiske eksempler</li>
                <li>• Quiz for å teste kunnskap</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 flex gap-4">
            <a
              href="/kurs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              Se alle kurs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
