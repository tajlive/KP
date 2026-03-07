"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  BookOpen, 
  Award,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthContext";
import { createClient } from "@/lib/utils";
import Link from "next/link";
import { useLocale } from "next-intl";

// 8 Interactive Course Modules
const courseModules = [
  {
    id: 1,
    slug: "hva-er-krypto",
    title: "Hva er kryptovaluta?",
    subtitle: "Bitcoin forklart som digitalt gull",
    duration: "15 min",
    level: "Nybegynner",
    content: {
      intro: "Kryptovaluta er digital penger som ikke kontrolleres av banker eller myndigheter. Tenk på det som digitalt gull du kan sende til hvem som helst, når som helst.",
      visual: {
        type: "comparison",
        items: [
          { label: "Tradisjonell bank", desc: "Kontrolleres av sentralbanker, begrenset åpningstid, høye gebyrer" },
          { label: "Kryptovaluta", desc: "Desentralisert, 24/7 tilgang, lave gebyrer" }
        ]
      },
      keyPoints: [
        "Kryptovaluta eksisterer kun digitalt - ingen fysiske mynter",
        "Blockchain-teknologi sikrer alle transaksjoner",
        "Bitcoin var den første kryptovalutaen (2009)"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva er hovedforskjellen mellom tradisjonelle banker og kryptovaluta?",
          options: [
            "Kryptovaluta har fysiske mynter",
            "Kryptovaluta er desentralisert og kontrolleres ikke av myndigheter",
            "Kryptovaluta er kun tilgjengelig i bankåpningstiden",
            "Kryptovaluta har høyere gebyrer enn banker"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Når ble Bitcoin lansert?",
          options: ["1999", "2009", "2019", "2020"],
          correct: 1
        },
        {
          id: 3,
          question: "Hva sikrer transaksjoner i kryptovaluta?",
          options: ["Banker", "Myndigheter", "Blockchain-teknologi", "Fysiske valutaer"],
          correct: 2
        },
        {
          id: 4,
          question: "Kan du sende kryptovaluta når som helst?",
          options: ["Nei, kun i bankåpningstiden", "Ja, 24/7", "Kun på hverdager", "Kun i Norge"],
          correct: 1
        }
      ]
    }
  },
  {
    id: 2,
    slug: "lommeboker",
    title: "Lommebøker og sikkerhet",
    subtitle: "Hvordan beskytte verdier",
    duration: "20 min",
    level: "Nybegynner",
    content: {
      intro: "En krypto-lommebok er som en digital bankkonto. Du må beskytte den godt - hvis noen får tilgang til dine private nøkler, har de tilgang til alle dine verdier.",
      visual: {
        type: "wallet-types",
        items: [
          { label: "Hot wallet", desc: "Tilkoblet internett, enkel å bruke, mindre sikker", example: "MetaMask, Coinbase Wallet" },
          { label: "Cold wallet", desc: "Offline, vanskeligere å bruke, mest sikker", example: "Ledger, Trezor" }
        ]
      },
      keyPoints: [
        "Never share your private keys or seed phrase",
        "Cold wallets are safest for large amounts",
        "Always double-check addresses before sending"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva er en 'seed phrase'?",
          options: [
            "En måte å plante krypto på",
            "En hemmelig kode som gir tilgang til lommeboken",
            "En type kryptovaluta",
            "En banktjeneste"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Hvilken lommebok-type er mest sikker for store beløp?",
          options: ["Hot wallet", "Cold wallet", "Paper wallet", "Exchange wallet"],
          correct: 1
        },
        {
          id: 3,
          question: "Skal du dele private nøkler med noen?",
          options: ["Ja, med banken", "Ja, med venner", "Nei, aldri", "Kun med myndigheter"],
          correct: 2
        }
      ]
    }
  },
  {
    id: 3,
    slug: "kjop-din-forste",
    title: "Kjøp din første krypto",
    subtitle: "Steg-for-steg med Binance",
    duration: "25 min",
    level: "Nybegynner",
    content: {
      intro: "Å kjøpe din første kryptovaluta er enklere enn du tror. Vi viser deg steg-for-steg hvordan du kommer i gang trygt.",
      visual: {
        type: "steps",
        items: [
          { step: 1, label: "Registrer deg", desc: "Opprett konto på en exchange (f.eks. Binance)" },
          { step: 2, label: "Verifiser", desc: "Fullfør KYC (Know Your Customer)" },
          { step: 3, label: "Sett inn penger", desc: "Bruk bankoverføring eller kort" },
          { step: 4, label: "Kjøp", desc: "Velg kryptovaluta og kjøp" }
        ]
      },
      keyPoints: [
        "Velg en regulert exchange",
        "Start med et lite beløp du kan tape",
        "Aktiver to-faktor-autentisering (2FA)"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva betyr KYC?",
          options: [
            "Krypto Your Cash",
            "Know Your Customer",
            "Key Your Code",
            "Keep Your Coins"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Hva bør du aktivere for ekstra sikkerhet?",
          options: ["Email-varsler", "2FA", "Push-varsler", "Nyhetsbrev"],
          correct: 1
        },
        {
          id: 3,
          question: "Hvor mye bør du starte med?",
          options: [
            "All sparepengene dine",
            "Et lite beløp du kan tape",
            "Lånte penger",
            "Minst 100 000 kr"
          ],
          correct: 1
        }
      ]
    }
  },
  {
    id: 4,
    slug: "autotrading",
    title: "Hva er autotrading?",
    subtitle: "DCA forklart enkelt",
    duration: "20 min",
    level: "Middels",
    content: {
      intro: "Autotrading lar deg automatisere dine investeringer. Dollar-Cost Averaging (DCA) betyr at du kjøper for samme beløp med jevne mellomrom - uavhengig av prisen.",
      visual: {
        type: "dca-chart",
        description: "Med DCA kjøper du mer når prisen er lav og mindre når prisen er høyt, automatisk."
      },
      keyPoints: [
        "DCA reduserer risikoen for å kjøpe på toppen",
        "Automatisering fjerner følelser fra trading",
        "Perfekt for langsiktige investeringer"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva betår DCA for?",
          options: [
            "Digital Currency Asset",
            "Dollar-Cost Averaging",
            "Daily Crypto Amount",
            "Direct Coin Access"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Hva er hovedfordelen med DCA?",
          options: [
            "Garantert profitt",
            "Reduserer risikoen for å kjøpe på toppen",
            "Ingen gebyrer",
            "Umiddelbar gevinst"
          ],
          correct: 1
        },
        {
          id: 3,
          question: "Hva fjerner automatisering fra trading?",
          options: ["Gebyrer", "Følelser", "Risiko", "Gevinst"],
          correct: 1
        }
      ]
    }
  },
  {
    id: 5,
    slug: "risiko-psykologi",
    title: "Risiko og psykologi",
    subtitle: "Hvorfor folk taper",
    duration: "30 min",
    level: "Middels",
    content: {
      intro: "De fleste tap i krypto kommer ikke fra manglende kunnskap, men fra følelser. Frykt og grådighet får oss til å kjøpe på toppen og selge på bunnen.",
      visual: {
        type: "emotions",
        items: [
          { emotion: "FOMO", desc: "Fear Of Missing Out - kjøper fordi alle andre gjør det" },
          { emotion: "Panikk", desc: "Selger alt når markedet faller" },
          { emotion: "Grådighet", desc: "Holder for lenge forventet mer gevinst" }
        ]
      },
      keyPoints: [
        "Har en plan og hold deg til den",
        "Invester aldri mer enn du kan tape",
        "Paper trading hjelper deg å lære uten risiko"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva er FOMO?",
          options: [
            "Fear Of Missing Out",
            "Fast Online Money Order",
            "Free Online Market Option",
            "Financial Open Market Offer"
          ],
          correct: 0
        },
        {
          id: 2,
          question: "Hva er den vanligste grunnen til tap i krypto?",
          options: [
            "Manglende teknisk kunnskap",
            "Følelser som frykt og grådighet",
            "Dårlig internett",
            "For høye gebyrer"
          ],
          correct: 1
        },
        {
          id: 3,
          question: "Hva hjelper paper trading med?",
          options: [
            "Å tjene penger raskt",
            "Å lære uten risiko",
            "Å unngå skatt",
            "Å få gratis krypto"
          ],
          correct: 1
        }
      ]
    }
  },
  {
    id: 6,
    slug: "lese-en-graf",
    title: "Lese en graf",
    subtitle: "Candlestick basics",
    duration: "25 min",
    level: "Middels",
    content: {
      intro: "En candlestick-graf viser prisbevegelse over tid. Hver 'stake' representerer en tidsperiode og viser åpnings-, høyeste, laveste og sluttkurs.",
      visual: {
        type: "candlestick",
        description: "Grønn candle = prisen gikk opp. Rød candle = prisen gikk ned."
      },
      keyPoints: [
        "Kroppen viser åpning og lukking",
        "Vikene viser høyeste og laveste pris",
        "Trends kan vare lengre enn du tror"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva viser en candlesticks kropp?",
          options: [
            "Kun høyeste pris",
            "Åpning og lukking",
            "Kun laveste pris",
            "Volum"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Hva betyr en grønn candle?",
          options: [
            "Prisen gikk ned",
            "Prisen gikk opp",
            "Ingen endring",
            "Høyt volum"
          ],
          correct: 1
        },
        {
          id: 3,
          question: "Hva viser vikene?",
          options: [
            "Åpning og lukking",
            "Høyeste og laveste pris",
            "Volum",
            "Tid"
          ],
          correct: 1
        }
      ]
    }
  },
  {
    id: 7,
    slug: "din-forste-bot",
    title: "Din første bot",
    subtitle: "Sett opp paper trading",
    duration: "35 min",
    level: "Avansert",
    content: {
      intro: "Nå skal du sette opp din første trading-bot - med paper trading! Dette betyr at du bruker virtuelle penger, så du kan lære uten risiko.",
      visual: {
        type: "bot-setup",
        steps: [
          "Velg strategi (DCA, Grid, etc.)",
          "Sett parametere (beløp, intervall)",
          "Aktiver paper trading",
          "Overvakk resultater"
        ]
      },
      keyPoints: [
        "Start alltid med paper trading",
        "Test strategier før du bruker ekte penger",
        "Hold en logg over dine beslutninger"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hva er paper trading?",
          options: [
            "Trading med ekte penger",
            "Trading med virtuelle penger for øving",
            "Trading med aksjer",
            "Trading kun på papir"
          ],
          correct: 1
        },
        {
          id: 2,
          question: "Hvorfor starte med paper trading?",
          options: [
            "For å tjene penger raskt",
            "For å lære uten risiko",
            "For å unngå skatt",
            "For å få bonuser"
          ],
          correct: 1
        },
        {
          id: 3,
          question: "Hva bør du holde logg over?",
          options: [
            "Kun profitt",
            "Dine beslutninger og resultater",
            "Andre traders",
            "Kun tap"
          ],
          correct: 1
        }
      ]
    }
  },
  {
    id: 8,
    slug: "fra-papir-til-ekte",
    title: "Fra papir til ekte",
    subtitle: "Når er du klar?",
    duration: "20 min",
    level: "Avansert",
    content: {
      intro: "Å gå fra paper trading til ekte trading er en stor beslutning. Du er klar når du har konsekvent profitt, emosjonell kontroll, og en solid plan.",
      visual: {
        type: "readiness",
        checklist: [
          "3+ måneder med paper trading",
          "Konsekvent profitt over tid",
          "Forstår risiko",
          "Har spart nødfond",
          "Investerer kun 'lekepenger'"
        ]
      },
      keyPoints: [
        "Vær ærlig med deg selv om din erfaring",
        "Start smått med ekte penger",
        "Aldri invester lånte penger"
      ]
    },
    quiz: {
      questions: [
        {
          id: 1,
          question: "Hvor lenge bør du paper trade før ekte trading?",
          options: ["1 uke", "1 måned", "3+ måneder", "1 dag"],
          correct: 2
        },
        {
          id: 2,
          question: "Hva er viktigst før du starter med ekte penger?",
          options: [
            "Ha en solid plan og emosjonell kontroll",
            "Kjøpe dyrt utstyr",
            "Følge influencere",
            "Investere alt på en gang"
          ],
          correct: 0
        },
        {
          id: 3,
          question: "Bør du noen gang investere lånte penger?",
          options: [
            "Ja, for å øke profitten",
            "Nei, aldri",
            "Kun hvis renten er lav",
            "Kun fra familie"
          ],
          correct: 1
        }
      ]
    }
  }
];

export default function KursModulClient({ slug }: { slug: string }) {
  const { user } = useAuth();
  const locale = useLocale();
  const courseModule = courseModules.find(m => m.slug === slug);
  
  const [currentStep, setCurrentStep] = useState<"intro" | "content" | "quiz" | "result">("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (user && courseModule) {
      loadProgress();
    }
  }, [user, courseModule]);

  const loadProgress = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("module_progress")
      .select("completed, score")
      .eq("user_id", user?.id)
      .eq("module_id", courseModule?.id)
      .single();
    
    if (data) {
      setCompleted(data.completed);
      setProgress(data.score || 0);
    }
  };

  if (!courseModule) {
    return <div>Modul ikke funnet</div>;
  }

  const totalQuestions = courseModule.quiz.questions.length;
  const correctAnswers = answers.filter((ans, idx) => 
    ans === courseModule.quiz.questions[idx].correct
  ).length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  const passed = score >= 80;

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);
  };

  const nextQuestion = async () => {
    const newAnswers = [...answers, selectedAnswer!];
    setAnswers(newAnswers);
    setSelectedAnswer(null);
    setShowExplanation(false);

    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Quiz complete
      const finalScore = Math.round(
        (newAnswers.filter((ans, idx) => 
          ans === courseModule.quiz.questions[idx].correct
        ).length / totalQuestions) * 100
      );
      
      // Save progress
      if (user) {
        const supabase = createClient();
        await supabase.from("module_progress").upsert({
          user_id: user.id,
          module_id: courseModule.id,
          completed: finalScore >= 80,
          score: finalScore,
          completed_at: finalScore >= 80 ? new Date().toISOString() : null,
        });
      }
      
      setCurrentStep("result");
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setCurrentStep("quiz");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Modul {courseModule.id} av 8</span>
            <span className="mx-2">•</span>
            <span>{courseModule.duration}</span>
            <span className="mx-2">•</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {courseModule.level}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{courseModule.title}</h1>
          <p className="text-slate-600">{courseModule.subtitle}</p>
          
          {completed && (
            <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg w-fit">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Fullført med {progress}%</span>
            </div>
          )}
        </div>

        {/* Content Steps */}
        <AnimatePresence mode="wait">
          {currentStep === "intro" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200"
            >
              <h2 className="text-xl font-semibold mb-4">Om denne modulen</h2>
              <p className="text-slate-600 mb-6">{courseModule.content.intro}</p>
              
              <div className="bg-slate-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold mb-3">Du vil lære:</h3>
                <ul className="space-y-2">
                  {courseModule.content.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button onClick={() => setCurrentStep("content")} className="w-full">
                Start modul
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === "content" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Visual Content */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                <h2 className="text-xl font-semibold mb-6">Visuell forklaring</h2>
                {courseModule.content.visual.type === "comparison" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {courseModule.content.visual.items?.map((item: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl">
                        <h3 className="font-semibold text-slate-900 mb-2">{item.label}</h3>
                        <p className="text-slate-600 text-sm">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                )}
                {courseModule.content.visual.type === "steps" && (
                  <div className="space-y-4">
                    {courseModule.content.visual.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                          {item.step}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{item.label}</h3>
                          <p className="text-slate-600 text-sm">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {courseModule.content.visual.type === "wallet-types" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {courseModule.content.visual.items?.map((item: any, i: number) => (
                      <div key={i} className={`p-4 rounded-xl ${i === 0 ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"}`}>
                        <h3 className="font-semibold text-slate-900 mb-2">{item.label}</h3>
                        <p className="text-slate-600 text-sm mb-2">{item.desc}</p>
                        <p className="text-xs text-slate-500">Eksempel: {item.example}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(courseModule.content.visual.type === "dca-chart" || 
                  courseModule.content.visual.type === "candlestick" ||
                  courseModule.content.visual.type === "emotions") && (
                  <div className="p-6 bg-slate-50 rounded-xl">
                    <p className="text-slate-600">{courseModule.content.visual.description}</p>
                    {courseModule.content.visual.items && (
                      <div className="mt-4 space-y-3">
                        {courseModule.content.visual.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                            <div>
                              <span className="font-medium text-slate-900">{item.emotion || item.label}:</span>
                              <span className="text-slate-600 ml-2">{item.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {courseModule.content.visual.steps && (
                      <ol className="mt-4 space-y-2 list-decimal list-inside">
                        {courseModule.content.visual.steps.map((step: string, i: number) => (
                          <li key={i} className="text-slate-600">{step}</li>
                        ))}
                      </ol>
                    )}
                    {courseModule.content.visual.checklist && (
                      <ul className="mt-4 space-y-2">
                        {courseModule.content.visual.checklist.map((item: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-slate-600">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* Key Points */}
              <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100">
                <h2 className="text-xl font-semibold mb-4 text-blue-900">Nøkkelpunkter</h2>
                <ul className="space-y-3">
                  {courseModule.content.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-blue-800">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {i + 1}
                      </div>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setCurrentStep("intro")} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tilbake
                </Button>
                <Button onClick={() => setCurrentStep("quiz")} className="flex-1">
                  Gå til quiz
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === "quiz" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200"
            >
              {/* Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                  <span>Spørsmål {currentQuestion + 1} av {totalQuestions}</span>
                  <span>{Math.round((currentQuestion / totalQuestions) * 100)}% fullført</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  {courseModule.quiz.questions[currentQuestion].question}
                </h2>
                <div className="space-y-3">
                  {courseModule.quiz.questions[currentQuestion].options.map((option, i) => {
                    const isCorrect = i === courseModule.quiz.questions[currentQuestion].correct;
                    const isSelected = selectedAnswer === i;
                    const showResult = showExplanation && (isSelected || isCorrect);
                    
                    return (
                      <button
                        key={i}
                        onClick={() => !showExplanation && handleAnswer(i)}
                        disabled={showExplanation}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                          showResult
                            ? isCorrect
                              ? "border-green-500 bg-green-50"
                              : isSelected
                                ? "border-red-500 bg-red-50"
                                : "border-slate-200"
                            : isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-700">{option}</span>
                          {showResult && isCorrect && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className={`p-4 rounded-xl mb-6 ${
                    selectedAnswer === courseModule.quiz.questions[currentQuestion].correct
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p className={`font-medium ${
                    selectedAnswer === courseModule.quiz.questions[currentQuestion].correct
                      ? "text-green-800"
                      : "text-red-800"
                  }`}>
                    {selectedAnswer === courseModule.quiz.questions[currentQuestion].correct
                      ? "✓ Riktig!"
                      : "✗ Feil. Riktig svar er markert."}
                  </p>
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep("content")}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tilbake til innhold
                </Button>
                {showExplanation && (
                  <Button onClick={nextQuestion} className="flex-1">
                    {currentQuestion < totalQuestions - 1 ? "Neste spørsmål" : "Se resultat"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === "result" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center"
            >
              <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
                passed ? "bg-green-100" : "bg-red-100"
              }`}>
                {passed ? (
                  <Award className="w-10 h-10 text-green-600" />
                ) : (
                  <RotateCcw className="w-10 h-10 text-red-600" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {passed ? "Gratulerer!" : "Ikke bestått"}
              </h2>
              <p className="text-slate-600 mb-6">
                {passed 
                  ? "Du har fullført modulen og bestått quizen." 
                  : "Du trenger 80% for å bestå. Prøv igjen!"}
              </p>

              <div className="text-4xl font-bold mb-2">
                <span className={passed ? "text-green-600" : "text-red-600"}>{score}%</span>
              </div>
              <p className="text-sm text-slate-500 mb-8">
                {correctAnswers} av {totalQuestions} riktige
              </p>

              <div className="flex gap-4 justify-center">
                {!passed && (
                  <Button variant="outline" onClick={restartQuiz}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Prøv igjen
                  </Button>
                )}
                <Link href={`/${locale}/kurs`}>
                  <Button>
                    {passed ? "Tilbake til kurs" : "Avslutt"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
