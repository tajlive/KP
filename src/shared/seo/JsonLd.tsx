export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: "Klarpakke",
    url: "https://www.klarpakke.no",
    logo: "https://www.klarpakke.no/logo.svg",
    description:
      "Norsk plattform for AI-trading med lekepenger — tren på kryptohandel med autonome AI-agenter på ekte markedsdata, helt gratis.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NO",
    },
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function CourseJsonLd({ locale }: { locale: string }) {
  const isNo = locale === "no";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: isNo ? "Klarpakke Trading Kurs" : "Klarpakke Trading Course",
    description: isNo
      ? "4-ukers intensivkurs i kryptotrading med lekepenger-simulator"
      : "4-week intensive crypto trading course with paper trading simulator",
    provider: {
      "@type": "Organization",
      name: "Klarpakke",
      url: "https://www.klarpakke.no",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "NOK",
      availability: "https://schema.org/InStock",
      category: "Free tier available",
    },
    educationalLevel: "Beginner",
    inLanguage: locale === "no" ? "nb" : "en",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
