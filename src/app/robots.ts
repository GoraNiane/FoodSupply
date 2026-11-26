import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://foodsupply.sn").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/catalogue",
          "/catalogue/",
          "/a-propos",
          "/comment-ca-marche",
          "/devenir-fournisseur",
          "/devenir-livreur",
          "/contact",
          "/faq",
          "/conditions-generales",
          "/politique-confidentialite",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/fournisseur",
          "/fournisseur/",
          "/restaurant",
          "/restaurant/",
          "/livreur",
          "/livreur/",
          "/suivi/",
          "/api/",
          "/connexion-admin",
          "/connexion-fournisseur",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
