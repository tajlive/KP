import { safeFetch } from '@/lib/sanity/client';
import { allFaqsQuery } from '@/lib/sanity/queries';
import { FAQList } from './FAQList';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
}

interface SanityFAQSectionProps {
  locale?: string;
}

function getFallbackFAQs(): FAQ[] {
  return [
    {
      _id: 'fallback-1',
      question: "Trenger jeg kunnskap om trading fra før?",
      answer: "Nei, du trenger ingen forkunnskaper. Våre kurs starter fra grunnleggende konsepter og bygger seg gradvis opp. Alt er forklart på norsk med praktiske eksempler.",
    },
    {
      _id: 'fallback-2',
      question: "Hva er lekepenger?",
      answer: "Lekepenger betyr at du trader med simulert kapital (100 000 kr) i et trygt miljø. Du får øve på å kjøpe og selge krypto, sette stop-loss, og teste strategier uten å risikere ekte penger.",
    },
    {
      _id: 'fallback-3',
      question: "Kan jeg få pengene tilbake hvis jeg ikke er fornøyd?",
      answer: "Ja, vi tilbyr 14 dagers full refusjon. Hvis du ikke er fornøyd av noen grunn, sender vi pengene tilbake uten spørsmål.",
    },
    {
      _id: 'fallback-4',
      question: "Hvor lang tid tar det å lære?",
      answer: "De fleste fullfører grunnkurset på 1-2 uker ved å bruke 30-60 minutter per dag. Du bestemmer selv tempo. Kurset er tilgjengelig 24/7.",
    },
    {
      _id: 'fallback-5',
      question: "Er dette en snarvei til raske penger?",
      answer: "Nei, trading er en ferdighet som krever læring, øvelse og disiplin. Vårt mål er å gi deg solid kunnskap som gjør deg til en informert og ansvarlig trader.",
    },
    {
      _id: 'fallback-6',
      question: "Hvilke betalingsmetoder aksepterer dere?",
      answer: "Betaling skjer via Stripe med blant annet Visa, Mastercard og PayPal (samt Apple Pay og Google Pay der Stripe støtter det). Betalingen er kryptert.",
    },
    {
      _id: 'fallback-7',
      question: "Fungerer dette på mobil?",
      answer: "Ja, hele plattformen er mobil-optimalisert. Du kan ta kurs, gjøre paper trades, og chatte med læringsassistenten fra telefonen din.",
    },
    {
      _id: 'fallback-8',
      question: "Hva om jeg har spørsmål underveis?",
      answer: "Læringsassistenten vår er tilgjengelig når som helst og svarer på norsk. I tillegg har du tilgang til community hvor du kan stille spørsmål og dele erfaringer.",
    },
    {
      _id: 'fallback-9',
      question: "Må jeg bruke en spesifikk broker?",
      answer: "Nei, Klarpakke er helt uavhengig. Du velger selv hvilken broker du vil bruke når du er klar til å trade med ekte penger.",
    },
    {
      _id: 'fallback-10',
      question: "Hva skjer etter jeg fullfører kurset?",
      answer: "Du får et digitalt sertifikat som bekrefter at du har fullført kurset. Du beholder tilgang til alt innhold for alltid, inkludert framtidige oppdateringer.",
    },
  ];
}

async function getFAQs(language: string): Promise<FAQ[]> {
  const fallback = getFallbackFAQs();
  return safeFetch<FAQ[]>(
    allFaqsQuery,
    { language },
    fallback,
    { next: { revalidate: 60, tags: ['sanity', 'sanity:faq'] } }
  );
}

export default async function SanityFAQSection({ locale = 'no' }: SanityFAQSectionProps) {
  const faqs = await getFAQs(locale);
  return <FAQList faqs={faqs} />;
}
