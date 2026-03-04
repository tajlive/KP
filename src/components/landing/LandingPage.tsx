import {
  Features,
  Footer,
  Hero,
  SocialProof,
  Testimonials,
  TrustBadges,
} from "@/components/landing";
import FinalCTASection from "./FinalCTASection";
import { LandingNavigation } from "./LandingNavigation";

interface LandingPageProps {
  language?: "no" | "en";
}

export function LandingPage({ language = "no" }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-slate-950 w-full overflow-x-hidden selection:bg-blue-500/30">
      <LandingNavigation />
      <main className="w-full">
        {/* Apple-style background glow */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-emerald-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10">
          <Hero language={language} />
          <TrustBadges language={language} />
          <Features language={language} />
          <SocialProof language={language} />
          <Testimonials language={language} />
          <FinalCTASection language={language} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
