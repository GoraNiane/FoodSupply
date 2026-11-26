import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma/client";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://foodsupply.sn").replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/catalogue`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/devenir-fournisseur`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/comment-ca-marche`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/conditions-generales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/politique-confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        offers: {
          some: {
            isActive: true,
            supplier: { verificationStatus: "APPROVED", isActive: true },
          },
        },
      },
      select: { slug: true, updatedAt: true },
      take: 500,
    });

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/catalogue/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily",
      priority: 0.8,
    }));

    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
