import { describe, expect, it } from "vitest";
import { computeClientPriceXof, formatXof } from "@/lib/utils/format";

describe("Utilitaires financiers FoodSupply (XOF)", () => {
  it("formate correctement un montant entier en FCFA", () => {
    expect(formatXof(2500)).toBe("2 500 FCFA");
    expect(formatXof(850000)).toBe("850 000 FCFA");
    expect(formatXof(0)).toBe("0 FCFA");
  });

  it("calcule une marge fixe XOF exacte (exemple cahier des charges : 1 800 -> 2 500)", () => {
    const result = computeClientPriceXof({
      supplierPriceXof: 1800,
      marginType: "FIXED_XOF",
      marginValue: 700,
    });
    expect(result.clientUnitPriceXof).toBe(2500);
    expect(result.marginUnitAmountXof).toBe(700);
  });

  it("calcule une marge en pourcentage (points de base) sans flottants imprécis", () => {
    const result = computeClientPriceXof({
      supplierPriceXof: 10000,
      marginType: "PERCENTAGE",
      marginValue: 1500, // 15.00%
    });
    expect(result.clientUnitPriceXof).toBe(11500);
    expect(result.marginUnitAmountXof).toBe(1500);
  });
});
