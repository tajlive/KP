import { groq } from 'next-sanity';

// =============================================================================
// LANDING PAGE QUERIES
// =============================================================================

export const landingContentQuery = groq`
  *[_type == "landingContent" && language == $language][0] {
    _id,
    heroTitle {
      line1,
      line2
    },
    heroSubtitle,
    heroCta {
      text,
      link
    },
    trustBadges[] {
      text,
      icon
    },
    kltTeaser {
      title,
      description,
      ctaText,
      ctaLink
    },
    socialProof {
      headline,
      stats[] {
        value,
        label,
        icon
      },
      perks[] {
        title,
        description,
        color,
        icon
      }
    },
    pricingHeader {
      title,
      subtitle
    },
    features[] {
      title,
      description,
      icon
    }
  }
`;

// =============================================================================
// DASHBOARD QUERIES
// =============================================================================

export const dashboardContentQuery = groq`
  *[_type == "dashboardContent" && language == $language][0] {
    _id,
    heroCtaText,
    heroCtaLink,
    smartActions[] {
      condition,
      title,
      description,
      ctaText,
      ctaLink,
      icon,
      color
    },
    upgradeBanner {
      title,
      description,
      ctaText,
      ctaLink
    }
  }
`;

// =============================================================================
// STRATEGY QUERIES
// =============================================================================

export const allStrategiesQuery = groq`
  *[_type == "strategy" && isActive == true] | order(riskLevel asc) {
    _id,
    name,
    slug,
    description,
    riskLevel,
    indicators,
    icon,
    color,
    stopLoss,
    takeProfit
  }
`;

export const strategyBySlugQuery = groq`
  *[_type == "strategy" && slug.current == $slug][0] {
    _id,
    name,
    description,
    longDescription,
    riskLevel,
    indicators,
    icon,
    color,
    stopLoss,
    takeProfit
  }
`;

// =============================================================================
// TRADE EXPLANATION QUERIES
// =============================================================================

export const tradeExplanationQuery = groq`
  *[_type == "tradeExplanation" && strategyKey == $strategyKey && language == $language][0] {
    _id,
    strategyKey,
    buyExplanation,
    sellExplanation,
    stopLossExplanation,
    takeProfitExplanation,
    learnMoreUrl
  }
`;

// =============================================================================
// PAGE QUERIES
// =============================================================================

export const pageBySlugQuery = groq`
  *[_type == "page" && slug.current == $slug && language == $language][0] {
    _id,
    title,
    metaTitle,
    metaDescription,
    content[] {
      ...,
      _type == "image" => {
        "url": asset->url,
        "dimensions": asset->metadata.dimensions
      }
    },
    publishedAt
  }
`;

// =============================================================================
// FAQ QUERIES
// =============================================================================

export const allFaqsQuery = groq`
  *[_type == "faq" && language == $language] | order(order asc) {
    _id,
    question,
    answer,
    category,
    order
  }
`;

export const faqsByCategoryQuery = groq`
  *[_type == "faq" && category == $category && language == $language] | order(order asc) {
    _id,
    question,
    answer,
    order
  }
`;

// =============================================================================
// TESTIMONIAL QUERIES
// =============================================================================

export const activeTestimonialsQuery = groq`
  *[_type == "testimonial" && isActive == true] | order(rating desc) {
    _id,
    name,
    role,
    quote,
    "avatarUrl": avatar.asset->url,
    rating,
    platform
  }
`;

// =============================================================================
// DYNAMIC PAGE QUERY (for catch-all routes)
// =============================================================================

export const dynamicPageQuery = groq`
  *[_type == "page" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    metaTitle,
    metaDescription,
    language,
    content[] {
      ...,
      _type == "image" => {
        "url": asset->url,
        "lqip": asset->metadata.lqip,
        "dimensions": asset->metadata.dimensions,
        alt
      },
      _type == "cta" => {
        text,
        link,
        style
      }
    }
  }
`;
