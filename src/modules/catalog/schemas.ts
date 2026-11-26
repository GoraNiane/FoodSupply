import { AvailabilityStatus, MarginType, StorageType } from "@prisma/client";
import { z } from "zod";

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2, "Nom de catégorie requis (2 caractères min).").max(80),
  slug: z.string().trim().max(90).optional(),
  description: z.string().trim().max(400).optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  marginType: z.nativeEnum(MarginType).optional().nullable(),
  marginValue: z.coerce.number().int().min(0).max(500000).optional().nullable(),
});

export const volumePriceTierSchema = z.object({
  minQty: z.coerce.number().int().min(2).max(100000),
  unitPriceXof: z.coerce.number().int().min(1).max(50000000),
});

export const deliveryZoneFeeSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(2).max(120),
  neighborhoods: z.array(z.string().trim().min(1).max(80)).min(1).max(40),
  feeXof: z.coerce.number().int().min(0).max(100000),
});

export const productWithOfferSchema = z.object({
  categoryId: z.string().trim().min(1, "Veuillez choisir une catégorie."),
  name: z.string().trim().min(2, "Nom du produit requis.").max(140),
  sku: z.string().trim().min(2, "Référence SKU requise.").max(40),
  unitLabel: z.string().trim().min(2, "Conditionnement requis (ex: Plateau de 30).").max(80),
  description: z.string().trim().max(1500).optional().nullable(),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (val) =>
        val === "" ||
        val.startsWith("/api/files/products/") ||
        val.startsWith("https://") ||
        val.startsWith("http://"),
      "URL ou image produit invalide."
    )
    .optional()
    .nullable(),
  origin: z.string().trim().max(80).default("Sénégal"),
  storageType: z.nativeEnum(StorageType).default(StorageType.AMBIENT),
  isFragile: z.boolean().default(false),
  isActive: z.boolean().default(true),
  // Champs offre vendeur unique (coût d'achat optionnel à partir de 0 si vous fixez directement le prix client)
  supplierPriceXof: z.coerce
    .number()
    .int("Le prix doit être un entier en FCFA.")
    .min(0, "Prix minimum : 0 FCFA.")
    .max(50000000),
  minOrderQty: z.coerce.number().int().min(1, "Quantité minimum >= 1.").max(10000).default(1),
  stockQty: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
  availability: z.nativeEnum(AvailabilityStatus).default(AvailabilityStatus.IN_STOCK),
  leadTimeHours: z.coerce.number().int().min(1).max(168).default(12),
  marginTypeOverride: z.nativeEnum(MarginType).optional().nullable(),
  marginValueOverride: z.coerce.number().int().min(0).max(500000).optional().nullable(),
  volumeTiers: z.array(volumePriceTierSchema).max(6).optional().nullable(),
});

export const bulkQuickProductUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().trim().min(1),
        clientUnitPriceXof: z.coerce.number().int().min(1).max(50000000),
        availability: z.nativeEnum(AvailabilityStatus),
        stockQty: z.coerce.number().int().min(0).max(1000000).optional().nullable(),
        isActive: z.boolean(),
      })
    )
    .min(1)
    .max(100),
});

export const defaultMarginSchema = z.object({
  marginType: z.nativeEnum(MarginType),
  marginValue: z.coerce.number().int().min(0).max(500000),
});

export const deliveryFeeRulesSchema = z.object({
  baseFeeXof: z.coerce.number().int().min(0).max(100000),
  extraSupplierPickupFeeXof: z.coerce.number().int().min(0).max(50000).default(0),
  coldChainSurchargeXof: z.coerce.number().int().min(0).max(50000),
  fragileSurchargeXof: z.coerce.number().int().min(0).max(50000),
  freeDeliveryThresholdXof: z.coerce.number().int().min(0).max(10000000),
  zoneFees: z.array(deliveryZoneFeeSchema).max(12).optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ProductWithOfferInput = z.infer<typeof productWithOfferSchema>;
export type DeliveryFeeRulesInput = z.infer<typeof deliveryFeeRulesSchema>;
