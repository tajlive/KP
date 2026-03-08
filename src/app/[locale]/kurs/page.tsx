interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function KursPage({ params }: PageProps) {
  const { locale } = await params;

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold mb-4">
        {locale === "no" ? "Kurs kommer snart" : "Courses Coming Soon"}
      </h1>
      <p className="text-xl text-muted-foreground mb-8">
        {locale === "no"
          ? "Vi bygger et komplett utdanningssystem for krypto-trading. Kommer i løpet av noen dager!"
          : "We are building a complete crypto trading education system. Coming within days!"}
      </p>
      <a
        href={`/${locale}/dashboard`}
        className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
      >
        {locale === "no" ? "Tilbake til Dashboard" : "Back to Dashboard"}
      </a>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  return {
    title: locale === "no" ? "Kurs" : "Courses",
    description:
      locale === "no"
        ? "Lær krypto-trading fra grunnen av"
        : "Learn crypto trading from scratch",
  };
}
