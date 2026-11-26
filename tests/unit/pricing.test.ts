import { describe, expect, it } from "vitest";
import { resolveOfferPricing } from "@/modules/catalog/pricing";

describe("Moteur de résolution des marges commerciales FoodSupply", () => {
  it("priorise la marge spécifique de l'offre sur le produit, la catégorie et le défaut", () => {
    const res = resolveOfferPricing(10000, {
      offerMarginType: "FIXED_XOF",
      offerMarginValue: 1200,
      productMarginType: "PERCENTAGE",
      productMarginValue: 2000,
      categoryMarginType: "PERCENTAGE",
      categoryMarginValue: 1500,
      defaultMarginType: "PERCENTAGE",
      defaultMarginValue: 1000,
    });
    expect(res.marginType).toBe("FIXED_XOF");
    expect(res.clientUnitPriceXof).toBe(11200);
    expect(res.marginUnitAmountXof).toBe(1200);
  });

  it("applique la marge produit si aucune surcharge offre n'est définie", () => {
    const res = resolveOfferPricing(20000, {
      productMarginType: "PERCENTAGE",
      productMarginValue: 1250, // 12.50%
      categoryMarginType: "PERCENTAGE",
      categoryMarginValue: 1500,
    });
    expect(res.clientUnitPriceXof).toBe(22500);
    expect(res.marginUnitAmountXof).toBe(2500);
  });

  it("applique la marge catégorie (exemple plateau d'œufs 1 800 + 700 = 2 500 FCFA)", () => {
    const res = resolveOfferPricing(1800, {
      categoryMarginType: "FIXED_XOF",
      categoryMarginValue: 700,
    });
    expect(res.clientUnitPriceXof).toBe(2500);
    expect(res.marginUnitAmountXof).toBe(700);
  });

  it("retombe sur la marge par défaut de la plateforme (15 %) si aucune règle spécifique", () => {
    const res = resolveOfferPricing(10000, {});
    expect(res.marginType).toBe("PERCENTAGE");
    expect(res.marginValue).toBe(1500);
    expect(res.clientUnitPriceXof).toBe(11500);
  });
});
