import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/en/", "/th/", "/zh/", "/sitemap.xml"],
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
          "/dashboard/",
          "/login",
          "/register",
          "/registrer",
        ],
      },
      {
        // AI crawlers - allow crawling public content for GEO (Generative Engine Optimization)
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/", "/login"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/", "/login"],
      },
      {
        userAgent: "CCBot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/", "/login"],
      },
      {
        // Googlebot - full access to public pages
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/"],
      },
      {
        // Bing - similar to Google
        userAgent: "Bingbot",
        allow: ["/"],
        disallow: ["/api/", "/_next/", "/admin-dashboard/", "/dashboard/"],
      },
    ],
    sitemap: "https://www.klarpakke.no/sitemap.xml",
    host: "https://www.klarpakke.no",
  };
}
