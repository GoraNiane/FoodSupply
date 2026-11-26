import type { MarginType } from "@prisma/client";
import { computeClientPriceXof } from "@/lib/utils/format";

export interface MarginRuleInput {
  offerMarginType?: MarginType | null;
  offerMarginValue?: number | null;
  productMarginType?: MarginType | null;
  productMarginValue?: number | null;
  categoryMarginType?: MarginType | null;
  categoryMarginValue?: number | null;
  defaultMarginType?: MarginType;
  defaultMarginValue?: number;
}

export interface ResolvedMarginPricing {
  marginType: MarginType;
  marginValue: number;
  clientUnitPriceXof: number;
  marginUnitAmountXof: number;
}

export interface VolumePriceTier {
  minQty: number;
  unitPriceXof: number;
}

/**
 * Normalise et trie les paliers de prix dégressifs stockés en JSON (tri croissant par minQty).
 */
export function normalizeVolumeTiers(raw: unknown): VolumePriceTier[] {
  if (!Array.isArray(raw)) return [];
  const dedup = new Map<number, number>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const minQty = Math.round(Number((entry as { minQty?: unknown }).minQty));
    const unitPriceXof = Math.round(Number((entry as { unitPriceXof?: unknown }).unitPriceXof));
    if (Number.isFinite(minQty) && minQty >= 2 && Number.isFinite(unitPriceXof) && unitPriceXof > 0) {
      dedup.set(minQty, unitPriceXof);
    }
  }
  return Array.from(dedup.entries())
    .map(([minQty, unitPriceXof]) => ({ minQty, unitPriceXof }))
    .sort((a, b) => a.minQty - b.minQty);
}

/**
 * Applique le palier de prix dégressif correspondant à la quantité commandée.
 * Ne peut jamais augmenter le prix au-dessus du prix unitaire de base.
 */
export function resolveVolumeTierUnitPrice(
  baseClientUnitPriceXof: number,
  quantity: number,
  tiers?: VolumePriceTier[] | null
): { effectiveUnitPriceXof: number; appliedTier: VolumePriceTier | null } {
  const safeBase = Math.max(0, Math.round(baseClientUnitPriceXof));
  const safeQty = Math.max(1, Math.round(quantity));
  const normalized = normalizeVolumeTiers(tiers);

  let appliedTier: VolumePriceTier | null = null;
  for (const tier of normalized) {
    if (safeQty >= tier.minQty && tier.unitPriceXof < safeBase) {
      appliedTier = tier;
    }
  }

  return {
    effectiveUnitPriceXof: appliedTier ? appliedTier.unitPriceXof : safeBase,
    appliedTier,
  };
}

/**
 * Résout la règle de marge applicable selon la hiérarchie déterministe FoodSupply :
 * 1. Override sur l'offre fournisseur
 * 2. Override sur le produit
 * 3. Règle de la catégorie
 * 4. Marge globale par défaut de la plateforme (15 % par défaut)
 */
export function resolveOfferPricing(
  supplierPriceXof: number,
  rules: MarginRuleInput
): ResolvedMarginPricing {
  let marginType: MarginType = rules.defaultMarginType ?? "PERCENTAGE";
  let marginValue: number = rules.defaultMarginValue ?? 1500;

  if (rules.offerMarginType != null && rules.offerMarginValue != null) {
    marginType = rules.offerMarginType;
    marginValue = rules.offerMarginValue;
  } else if (rules.productMarginType != null && rules.productMarginValue != null) {
    marginType = rules.productMarginType;
    marginValue = rules.productMarginValue;
  } else if (rules.categoryMarginType != null && rules.categoryMarginValue != null) {
    marginType = rules.categoryMarginType;
    marginValue = rules.categoryMarginValue;
  }

  const { clientUnitPriceXof, marginUnitAmountXof } = computeClientPriceXof({
    supplierPriceXof,
    marginType,
    marginValue,
  });

  return {
    marginType,
    marginValue,
    clientUnitPriceXof,
    marginUnitAmountXof,
  };
}
