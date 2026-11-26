import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  productWithOfferSchema,
  slugify,
} from "@/modules/catalog/schemas";
import {
  computeDeliveryFeeXof,
  DEFAULT_DELIVERY_FEE_RULES,
} from "@/modules/deliveries/fee-calculator";

describe("Validation Catalogue Admin (Vendeur Unique)", () => {
  it("normalise proprement les slugs français avec accents", () => {
    expect(slugify("Œufs & Produits Laitiers")).toBe("ufs-produits-laitiers");
    expect(slugify("Farine de blé pâtissière T55")).toBe("farine-de-ble-patissiere-t55");
  });

  it("valide une catégorie avec marge fixe FCFA", () => {
    const parsed = categoryInputSchema.safeParse({
      name: "Œufs frais",
      marginType: "FIXED_XOF",
      marginValue: 700,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejette un produit avec un prix négatif", () => {
    const parsed = productWithOfferSchema.safeParse({
      categoryId: "cat-1",
      name: "Poulet entier",
      sku: "FS-01",
      unitLabel: "Carton 10 kg",
      supplierPriceXof: -100,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("Calculateur de frais de livraison Dakar (XOF)", () => {
  it("calcule base + supplément froid + supplément fragile", () => {
    const res = computeDeliveryFeeXof({
      subtotalClientXof: 40000,
      requiresColdChain: true,
      hasFragileItems: true,
      rules: DEFAULT_DELIVERY_FEE_RULES,
    });
    expect(res.freeDeliveryApplied).toBe(false);
    expect(res.baseFeeXof).toBe(2000);
    expect(res.coldChainFeeXof).toBe(1000);
    expect(res.fragileFeeXof).toBe(500);
    expect(res.totalDeliveryFeeXof).toBe(3500);
  });

  it("applique la livraison gratuite au-dessus du seuil configuré", () => {
    const res = computeDeliveryFeeXof({
      subtotalClientXof: 300000,
      requiresColdChain: true,
      hasFragileItems: true,
      rules: DEFAULT_DELIVERY_FEE_RULES,
    });
    expect(res.freeDeliveryApplied).toBe(true);
    expect(res.totalDeliveryFeeXof).toBe(0);
  });
});
