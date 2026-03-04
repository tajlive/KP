import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/no/", "/en/", "/th/", "/zh/", "/sitemap.xml"],
        disallow: [
          "/api/",
          "/_next/",
          "/admin-dashboard/",
          "/admin/",
          "/super-admin/",
          "/private/",
          "/*.json$",
          "/*.rsc$",
          "/admin-login",
        ],
      },
      {
        // AI crawlers - allow crawling public content for GEO (Generative Engine Optimization)
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/"],
      },
      {
        userAgent: "CCBot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/"],
      },
      {
        // Googlebot - full access to public pages
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/"],
      },
      {
        // Bing - similar to Google
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/"],
      },
    ],
    sitemap: "https://www.klarpakke.no/sitemap.xml",
    host: "https://www.klarpakke.no",
  };
}
