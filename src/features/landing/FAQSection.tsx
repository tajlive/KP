
import { useVippsMarket } from "@/shared/providers/VippsMarketProvider";
import { FAQList } from "./FAQList";

export default function FAQSection() {
  const { showVipps } = useVippsMarket();

  const paymentAnswer = showVipps
    ? "Vi tilbyr Vipps (Norge, Sverige, Danmark og Finland), og betaling via Stripe med blant annet Visa, Mastercard og PayPal (samt Apple Pay og Google Pay der Stripe støtter det). Betalingen er kryptert; vi lagrer ikke kortinformasjonen din."
    : "Betaling skjer via Stripe med blant annet Visa, Mastercard og PayPal (samt Apple Pay og Google Pay der Stripe støtter det). Betalingen er kryptert; vi lagrer ikke kortinformasjonen din.";

  const faqs = [
    {
      question: "Trenger jeg kunnskap om trading fra før?",
      answer:
        "Nei, du trenger ingen forkunnskaper. Våre kurs starter fra grunnleggende konsepter og bygger seg gradvis opp. Alt er forklart på norsk med praktiske eksempler. Du lærer steg-for-steg, fra de mest grunnleggende prinsippene til avanserte strategier.",
    },
    {
      question: "Hva er lekepenger?",
      answer:
        "Lekepenger betyr at du trader med simulert kapital (100 000 kr) i et trygt miljø. Du får øve på å kjøpe og selge krypto, sette stop-loss, og teste strategier uten å risikere ekte penger. Det er som en flysimulator for trading — du lærer uten konsekvenser.",
    },
    {
      question: "Kan jeg få pengene tilbake hvis jeg ikke er fornøyd?",
      answer:
        "Ja, vi tilbyr 14 dagers full refusjon. Hvis du ikke er fornøyd av noen grunn, sender vi pengene tilbake uten spørsmål. Det er vår personlige garanti til deg.",
    },
    {
      question: "Hvor lang tid tar det å lære?",
      answer:
        "De fleste fullfører grunnkurset på 1-2 uker ved å bruke 30-60 minutter per dag. Du bestemmer selv tempo. Kurset er tilgjengelig 24/7, så du kan lære når det passer deg best. Noen bruker lengre tid, andre kortere — det viktigste er at du lærer grundig.",
    },
    {
      question: "Er dette en snarvei til raske penger?",
      answer:
        "Nei, trading er en ferdighet som krever læring, øvelse og disiplin. Vårt mål er å gi deg solid kunnskap som gjør deg til en informert og ansvarlig trader. Vi fokuserer på langsiktig læring, ikke urealistiske løfter om raske penger.",
    },
    {
      question: "Hvilke betalingsmetoder aksepterer dere?",
      answer: paymentAnswer,
    },
    {
      question: "Fungerer dette på mobil?",
      answer:
        "Ja, hele plattformen er mobil-optimalisert. Du kan ta kurs, gjøre paper trades, og chatte med læringsassistenten fra telefonen din. Lær hvor som helst, når som helst.",
    },
    {
      question: "Hva om jeg har spørsmål underveis?",
      answer:
        "Læringsassistenten vår er tilgjengelig når som helst og svarer på norsk. I tillegg har du tilgang til community hvor du kan stille spørsmål og dele erfaringer med andre studenter. Vi svarer også på e-post innen 24 timer.",
    },
    {
      question: "Må jeg bruke en spesifikk broker?",
      answer:
        "Nei, Klarpakke er helt uavhengig. Du velger selv hvilken broker du vil bruke når du er klar til å trade med ekte penger. Vi gir deg kunnskapen — du bestemmer selv hvor du vil trade.",
    },
    {
      question: "Hva skjer etter jeg fullfører kurset?",
      answer:
        "Du får et digitalt sertifikat som bekrefter at du har fullført kurset. Du beholder tilgang til alt innhold for alltid, inkludert framtidige oppdateringer. Du kan også oppgradere til høyere planer for mer avanserte funksjoner når du er klar.",
    },
  ];

  return <FAQList faqs={faqs} />;
}
