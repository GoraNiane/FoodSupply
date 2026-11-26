import { unstable_cache } from "next/cache";
import type { MarginType } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { normalizeVolumeTiers, resolveOfferPricing } from "@/modules/catalog/pricing";
import {
  DEFAULT_DAKAR_ZONES,
  DEFAULT_DELIVERY_FEE_RULES,
  type DeliveryFeeRules,
} from "@/modules/deliveries/fee-calculator";

/**
 * Retourne (ou crée automatiquement) le profil fournisseur interne rattaché au vendeur unique FoodSupply.
 * Permet à l'Admin d'ajouter ses produits directement sans étapes fournisseurs superflues,
 * tout en conservant le schéma relationnel complet pour une éventuelle ouverture multi-vendeurs.
 */
export async function ensurePrimaryVendorSupplier(adminUserId: string) {
  const existing = await prisma.supplier.findFirst({
    where: { verificationStatus: "APPROVED", isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing;
  }

  return prisma.supplier.upsert({
    where: { userId: adminUserId },
    update: { verificationStatus: "APPROVED", isActive: true },
    create: {
      userId: adminUserId,
      companyName: "FoodSupply Dakar",
      tradeName: "FoodSupply Direct",
      description: "Approvisionnement direct FoodSupply Dakar.",
      pickupAddress: "Sacré-Cœur 3, VDN",
      pickupNeighborhood: "Sacré-Cœur",
      pickupCity: "Dakar",
      contactPhone: "+221 33 820 45 00",
      verificationStatus: "APPROVED",
      verifiedAt: new Date(),
      verifiedById: adminUserId,
      isActive: true,
    },
  });
}

export async function getPlatformDefaultMargin(): Promise<{
  marginType: MarginType;
  marginValue: number;
}> {
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
    // Fallback par défaut
  }
  return { marginType: "PERCENTAGE", marginValue: 1500 };
}

export const getPlatformDeliveryRules = unstable_cache(
  async (): Promise<DeliveryFeeRules> => {
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: "delivery_fee_rules" },
      });
      const val = setting?.valueJson as Partial<DeliveryFeeRules> | undefined;
      if (val && typeof val.baseFeeXof === "number") {
        return {
          baseFeeXof: val.baseFeeXof,
          extraSupplierPickupFeeXof: val.extraSupplierPickupFeeXof ?? 0,
          coldChainSurchargeXof: val.coldChainSurchargeXof ?? 1000,
          fragileSurchargeXof: val.fragileSurchargeXof ?? 500,
          freeDeliveryThresholdXof: val.freeDeliveryThresholdXof ?? 250000,
          zoneFees:
            Array.isArray(val.zoneFees) && val.zoneFees.length > 0
              ? val.zoneFees
              : DEFAULT_DAKAR_ZONES,
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_DELIVERY_FEE_RULES;
  },
  ["foodsupply-delivery-rules"],
  { revalidate: 120, tags: ["settings"] }
);

export async function listAdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { products: true } },
    },
  });

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    marginType: c.marginType,
    marginValue: c.marginValue,
    productCount: c._count.products,
  }));
}

export async function listAdminProducts() {
  const [defaultMargin, products] = await Promise.all([
    getPlatformDefaultMargin(),
    prisma.product.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        category: true,
        offers: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  return products.map((product) => {
    const primaryOffer = product.offers[0] ?? null;
    const supplierPriceXof = primaryOffer?.supplierPriceXof ?? 0;
    const pricing = resolveOfferPricing(supplierPriceXof, {
      offerMarginType: primaryOffer?.marginTypeOverride,
      offerMarginValue: primaryOffer?.marginValueOverride,
      productMarginType: product.marginType,
      productMarginValue: product.marginValue,
      categoryMarginType: product.category.marginType,
      categoryMarginValue: product.category.marginValue,
      defaultMarginType: defaultMargin.marginType,
      defaultMarginValue: defaultMargin.marginValue,
    });

    return {
      id: product.id,
      offerId: primaryOffer?.id ?? null,
      categoryId: product.categoryId,
      categoryName: product.category.name,
      categoryMarginType: product.category.marginType,
      categoryMarginValue: product.category.marginValue,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      unitLabel: product.unitLabel,
      description: product.description,
      imageUrl: product.imageUrl,
      origin: product.origin,
      storageType: product.storageType,
      isFragile: product.isFragile,
      isActive: product.isActive,
      supplierPriceXof,
      clientUnitPriceXof: pricing.clientUnitPriceXof,
      marginUnitAmountXof: pricing.marginUnitAmountXof,
      effectiveMarginType: pricing.marginType,
      effectiveMarginValue: pricing.marginValue,
      marginTypeOverride: primaryOffer?.marginTypeOverride ?? null,
      marginValueOverride: primaryOffer?.marginValueOverride ?? null,
      minOrderQty: primaryOffer?.minOrderQty ?? 1,
      stockQty: primaryOffer?.stockQty ?? null,
      availability: primaryOffer?.availability ?? "ON_CONFIRMATION",
      leadTimeHours: primaryOffer?.leadTimeHours ?? 12,
      volumeTiers: normalizeVolumeTiers(product.volumeTiers),
    };
  });
}
