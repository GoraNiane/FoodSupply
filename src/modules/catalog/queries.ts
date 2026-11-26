import { unstable_cache } from "next/cache";
import type { AvailabilityStatus, MarginType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { normalizeVolumeTiers, resolveOfferPricing } from "./pricing";
import type { CatalogProductCardData } from "@/components/catalog/product-card";

export interface PublicCategorySummary {
  id: string;
  name: string;
  slug: string;
  iconName: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface CatalogFilterParams {
  q?: string;
  category?: string;
  availability?: AvailabilityStatus;
  maxPriceXof?: number;
  sort?: "relevance" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
}

const fetchDefaultMarginCached = unstable_cache(
  async (): Promise<{ marginType: MarginType; marginValue: number }> => {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: "default_margin" },
      });
      const val = setting?.valueJson as
        | { marginType?: MarginType; marginValue?: number }
        | undefined;
      if (val?.marginType && typeof val.marginValue === "number") {
        return { marginType: val.marginType, marginValue: val.marginValue };
      }
    } catch {
      // Fallback
    }
    return { marginType: "PERCENTAGE", marginValue: 1500 };
  },
  ["foodsupply-default-margin"],
  { revalidate: 120, tags: ["settings", "catalog"] }
);

const fetchPublicCategoriesCached = unstable_cache(
  async (): Promise<{ dbAvailable: boolean; categories: PublicCategorySummary[] }> => {
    try {
      const rows = await prisma.category.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          iconName: true,
          imageUrl: true,
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                  offers: {
                    some: {
                      isActive: true,
                      supplier: { verificationStatus: "APPROVED", isActive: true },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return {
        dbAvailable: true,
        categories: rows.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          iconName: c.iconName,
          imageUrl: c.imageUrl,
          productCount: c._count.products,
        })),
      };
    } catch {
      return { dbAvailable: false, categories: [] };
    }
  },
  ["foodsupply-public-categories"],
  { revalidate: 60, tags: ["catalog"] }
);

const fetchAllPublishedProductsCached = unstable_cache(
  async (): Promise<{
    dbAvailable: boolean;
    items: Array<CatalogProductCardData & { categorySlug: string; sku: string; description: string }>;
  }> => {
    try {
      const [defaultMargin, products] = await Promise.all([
        fetchDefaultMarginCached(),
        prisma.product.findMany({
          where: {
            isActive: true,
            offers: {
              some: {
                isActive: true,
                supplier: { verificationStatus: "APPROVED", isActive: true },
              },
            },
          },
          select: {
            id: true,
            slug: true,
            sku: true,
            name: true,
            description: true,
            unitLabel: true,
            imageUrl: true,
            storageType: true,
            isFragile: true,
            marginType: true,
            marginValue: true,
            volumeTiers: true,
            category: {
              select: {
                name: true,
                slug: true,
                marginType: true,
                marginValue: true,
              },
            },
            offers: {
              where: {
                isActive: true,
                supplier: { verificationStatus: "APPROVED", isActive: true },
              },
              select: {
                id: true,
                supplierPriceXof: true,
                minOrderQty: true,
                availability: true,
                marginTypeOverride: true,
                marginValueOverride: true,
              },
            },
          },
        }),
      ]);

      const items: Array<
        CatalogProductCardData & { categorySlug: string; sku: string; description: string }
      > = [];

      for (const product of products) {
        if (product.offers.length === 0) continue;

        const rankedOffers = product.offers
          .map((offer) => {
            const pricing = resolveOfferPricing(offer.supplierPriceXof, {
              offerMarginType: offer.marginTypeOverride,
              offerMarginValue: offer.marginValueOverride,
              productMarginType: product.marginType,
              productMarginValue: product.marginValue,
              categoryMarginType: product.category.marginType,
              categoryMarginValue: product.category.marginValue,
              defaultMarginType: defaultMargin.marginType,
              defaultMarginValue: defaultMargin.marginValue,
            });
            return { offer, clientUnitPriceXof: pricing.clientUnitPriceXof };
          })
          .sort((a, b) => {
            const scoreA = a.offer.availability === "IN_STOCK" ? 0 : 1;
            const scoreB = b.offer.availability === "IN_STOCK" ? 0 : 1;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.clientUnitPriceXof - b.clientUnitPriceXof;
          });

        const best = rankedOffers[0]!;
        items.push({
          offerId: best.offer.id,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          description: product.description ?? "",
          categoryName: product.category.name,
          categorySlug: product.category.slug,
          unitLabel: product.unitLabel,
          imageUrl: product.imageUrl,
          storageType: product.storageType,
          isFragile: product.isFragile,
          clientUnitPriceXof: best.clientUnitPriceXof,
          availability: best.offer.availability,
          minOrderQty: best.offer.minOrderQty,
          volumeTiers: normalizeVolumeTiers(product.volumeTiers),
        });
      }

      return { dbAvailable: true, items };
    } catch {
      return { dbAvailable: false, items: [] };
    }
  },
  ["foodsupply-published-catalog-v1"],
  { revalidate: 60, tags: ["catalog"] }
);

export async function getPublicCategories() {
  return fetchPublicCategoriesCached();
}

/**
 * Recherche ultra-rapide sur le catalogue publié en cache serveur (0 aller-retour TiDB Cloud
 * pendant la fenêtre de cache, invalidé instantanément dès qu'un admin publie/modifie un produit).
 */
export async function searchPublicCatalog(params: CatalogFilterParams = {}): Promise<{
  dbAvailable: boolean;
  items: CatalogProductCardData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(24, Math.max(1, params.pageSize ?? 12));

  const cached = await fetchAllPublishedProductsCached();
  if (!cached.dbAvailable) {
    return { dbAvailable: false, items: [], total: 0, page: 1, totalPages: 1 };
  }

  let filtered = cached.items;

  if (params.category) {
    filtered = filtered.filter((item) => item.categorySlug === params.category);
  }
  if (params.availability) {
    filtered = filtered.filter((item) => item.availability === params.availability);
  }
  if (params.q) {
    const qLower = params.q.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(qLower) ||
        item.description.toLowerCase().includes(qLower) ||
        item.sku.toLowerCase().includes(qLower)
    );
  }
  if (params.maxPriceXof && params.maxPriceXof > 0) {
    filtered = filtered.filter((item) => item.clientUnitPriceXof <= params.maxPriceXof!);
  }

  const sorted = [...filtered];
  if (params.sort === "price_asc") {
    sorted.sort((a, b) => a.clientUnitPriceXof - b.clientUnitPriceXof);
  } else if (params.sort === "price_desc") {
    sorted.sort((a, b) => b.clientUnitPriceXof - a.clientUnitPriceXof);
  } else {
    sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    dbAvailable: true,
    items: sorted.slice(start, start + pageSize).map((item) => ({
      offerId: item.offerId,
      slug: item.slug,
      name: item.name,
      categoryName: item.categoryName,
      unitLabel: item.unitLabel,
      imageUrl: item.imageUrl,
      storageType: item.storageType,
      isFragile: item.isFragile,
      clientUnitPriceXof: item.clientUnitPriceXof,
      availability: item.availability,
      minOrderQty: item.minOrderQty,
      volumeTiers: item.volumeTiers,
    })),
    total,
    page,
    totalPages,
  };
}

export async function getPublicProductBySlug(slug: string) {
  const fetchBySlug = unstable_cache(
    async () => {
      try {
        const [defaultMargin, product] = await Promise.all([
          fetchDefaultMarginCached(),
          prisma.product.findFirst({
            where: { slug, isActive: true },
            include: {
              category: true,
              offers: {
                where: {
                  isActive: true,
                  supplier: { verificationStatus: "APPROVED", isActive: true },
                },
                select: {
                  id: true,
                  supplierPriceXof: true,
                  minOrderQty: true,
                  availability: true,
                  leadTimeHours: true,
                  marginTypeOverride: true,
                  marginValueOverride: true,
                },
              },
            },
          }),
        ]);

        if (!product) return { dbAvailable: true, product: null };

        const ranked = product.offers
          .map((offer) => {
            const pricing = resolveOfferPricing(offer.supplierPriceXof, {
              offerMarginType: offer.marginTypeOverride,
              offerMarginValue: offer.marginValueOverride,
              productMarginType: product.marginType,
              productMarginValue: product.marginValue,
              categoryMarginType: product.category.marginType,
              categoryMarginValue: product.category.marginValue,
              defaultMarginType: defaultMargin.marginType,
              defaultMarginValue: defaultMargin.marginValue,
            });
            return {
              id: offer.id,
              clientUnitPriceXof: pricing.clientUnitPriceXof,
              minOrderQty: offer.minOrderQty,
              availability: offer.availability,
              leadTimeHours: offer.leadTimeHours,
            };
          })
          .sort((a, b) => {
            const scoreA = a.availability === "IN_STOCK" ? 0 : 1;
            const scoreB = b.availability === "IN_STOCK" ? 0 : 1;
            if (scoreA !== scoreB) return scoreA - scoreB;
            return a.clientUnitPriceXof - b.clientUnitPriceXof;
          });

        const primaryOffer = ranked[0] ?? null;
        const gallery = Array.isArray(product.galleryUrls)
          ? (product.galleryUrls as string[]).filter((u) => typeof u === "string")
          : [];

        return {
          dbAvailable: true,
          product: {
            id: product.id,
            slug: product.slug,
            sku: product.sku,
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            galleryUrls: gallery,
            unitLabel: product.unitLabel,
            origin: product.origin,
            storageType: product.storageType,
            isFragile: product.isFragile,
            volumeTiers: normalizeVolumeTiers(product.volumeTiers),
            category: { name: product.category.name, slug: product.category.slug },
            offer: primaryOffer,
          },
        };
      } catch {
        return { dbAvailable: false, product: null };
      }
    },
    [`foodsupply-product-${slug}`],
    { revalidate: 60, tags: ["catalog"] }
  );

  return fetchBySlug();
}
