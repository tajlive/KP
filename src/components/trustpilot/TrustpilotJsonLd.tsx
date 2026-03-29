import { getSummary, getReviews } from "@/lib/trustpilot/api";
import { isMockData } from "@/lib/trustpilot/mock-reviews";

interface TrustpilotJsonLdProps {
  maxReviews?: number;
}

export async function TrustpilotJsonLd({ maxReviews = 3 }: TrustpilotJsonLdProps) {
  try {
    const [summary, reviews] = await Promise.all([
      getSummary(),
      getReviews(maxReviews),
    ]);
    
    const isDemo = isMockData();

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Klarpakke",
      url: "https://www.klarpakke.no",
      logo: "https://www.klarpakke.no/logo.svg",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: summary.stars.toString(),
        reviewCount: summary.count.toString(),
        bestRating: "5",
        worstRating: "1",
      },
      review: reviews.map((review) => ({
        "@type": "Review",
        author: {
          "@type": "Person",
          name: review.author,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: review.stars.toString(),
          bestRating: "5",
        },
        reviewBody: review.text,
        headline: review.title,
        datePublished: review.date,
      })),
      // Add disclaimer for demo data
      ...(isDemo && {
        description: "Klarpakke - Norges første krypto-utdanningsplattform med simulert trading. (Demo reviews shown)",
      }),
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    );
  } catch (error) {
    // Return basic organization schema without ratings if data fetch fails
    // We don't include fake ratings - only real data from Trustpilot API
    const fallbackJsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Klarpakke",
      url: "https://www.klarpakke.no",
      logo: "https://www.klarpakke.no/logo.svg",
      description: "Klarpakke - Norges første krypto-utdanningsplattform med paper trading og auto-handel",
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(fallbackJsonLd) }}
      />
    );
  }
}
