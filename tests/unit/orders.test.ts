import { describe, expect, it } from "vitest";
import {
  assertOrderTransition,
  canTransitionOrderStatus,
  getOrderStepperIndex,
} from "@/modules/orders/state-machine";
import {
  buildUniqueOrderNumber,
  recomputeSupplierOrdersIndividually,
} from "@/modules/orders/helpers";
import {
  adminConfirmOrderSchema,
  clientOrderDecisionSchema,
  submitOrderSchema,
} from "@/modules/orders/schemas";

describe("Machine à états des commandes FoodSupply (14 statuts)", () => {
  it("autorise le cycle complet confirmation -> paiement -> préparation -> livraison", () => {
    expect(canTransitionOrderStatus("BROUILLON", "EN_ATTENTE_CONFIRMATION")).toBe(true);
    expect(canTransitionOrderStatus("EN_ATTENTE_CONFIRMATION", "PARTIELLEMENT_CONFIRME")).toBe(true);
    expect(canTransitionOrderStatus("PARTIELLEMENT_CONFIRME", "EN_ATTENTE_PAIEMENT")).toBe(true);
    expect(canTransitionOrderStatus("EN_ATTENTE_PAIEMENT", "PAYEE")).toBe(true);
    expect(canTransitionOrderStatus("PAYEE", "EN_PREPARATION")).toBe(true);
    expect(canTransitionOrderStatus("EN_PREPARATION", "EN_LIVRAISON")).toBe(true);
    expect(canTransitionOrderStatus("EN_LIVRAISON", "LIVREE")).toBe(true);
  });

  it("interdit de passer directement en PAYEE ou LIVREE sans confirmation préalable", () => {
    expect(canTransitionOrderStatus("EN_ATTENTE_CONFIRMATION", "PAYEE")).toBe(false);
    expect(canTransitionOrderStatus("PARTIELLEMENT_CONFIRME", "PAYEE")).toBe(false);
    expect(canTransitionOrderStatus("EN_ATTENTE_CONFIRMATION", "LIVREE")).toBe(false);
    expect(canTransitionOrderStatus("ANNULEE", "PAYEE")).toBe(false);
    expect(() => assertOrderTransition("EN_ATTENTE_CONFIRMATION", "PAYEE")).toThrow(
      /Transition de statut interdite/
    );
  });

  it("calcule correctement l'étape du Stepper client", () => {
    expect(getOrderStepperIndex("BROUILLON")).toBe(0);
    expect(getOrderStepperIndex("EN_ATTENTE_CONFIRMATION")).toBe(1);
    expect(getOrderStepperIndex("PARTIELLEMENT_CONFIRME")).toBe(1);
    expect(getOrderStepperIndex("EN_ATTENTE_PAIEMENT")).toBe(2);
    expect(getOrderStepperIndex("PAYEE")).toBe(3);
    expect(getOrderStepperIndex("LIVREE")).toBe(3);
  });
});

describe("Validations Zod des commandes invitées & confirmations Admin", () => {
  it("accepte une commande invitée Dakar sans compte ni email ni nom de restaurant obligatoire", () => {
    const res = submitOrderSchema.safeParse({
      items: [{ offerId: "offer-1", quantity: 10 }],
      restaurantName: "",
      contactName: "Ibrahima Fall",
      phone: "+221 77 123 45 67",
      email: "",
      neighborhood: "Almadies",
      street: "Route des Almadies Zone 12",
      landmark: "Face station Shell",
      deliverySlot: "MATIN_08_11",
    });
    expect(res.success).toBe(true);
  });

  it("rejette un panier vide ou une quantité nulle", () => {
    expect(
      submitOrderSchema.safeParse({
        items: [],
        restaurantName: "Resto",
        contactName: "Chef",
        phone: "771234567",
        neighborhood: "Plateau",
        street: "Rue 10",
      }).success
    ).toBe(false);
  });

  it("valide une confirmation Admin avec quantité ajustée et une décision client", () => {
    expect(
      adminConfirmOrderSchema.safeParse({
        items: [
          {
            orderItemId: "item-1",
            confirmedQty: 8,
            confirmedClientUnitPriceXof: 2600,
            confirmedSupplierUnitPriceXof: 1900,
          },
        ],
        deliveryFeeXof: 2500,
      }).success
    ).toBe(true);

    expect(
      clientOrderDecisionSchema.safeParse({
        decision: "ACCEPT",
        guestToken: "abcdef1234567890",
      }).success
    ).toBe(true);
  });

  it("recalcule chaque sous-commande fournisseur indépendamment sans mélanger les sous-totaux (#1)", () => {
    const recomputed = recomputeSupplierOrdersIndividually([
      {
        supplierOrderId: "sup-A",
        confirmedQty: 10,
        lineSupplierTotalXof: 18000,
        itemStatus: "CONFIRMED",
      },
      {
        supplierOrderId: "sup-B",
        confirmedQty: 3,
        lineSupplierTotalXof: 9000,
        itemStatus: "ADJUSTED",
      },
      {
        supplierOrderId: "sup-C",
        confirmedQty: 0,
        lineSupplierTotalXof: 0,
        itemStatus: "REJECTED",
      },
    ]);

    const byId = new Map(recomputed.map((r) => [r.supplierOrderId, r]));
    expect(byId.get("sup-A")).toEqual({
      supplierOrderId: "sup-A",
      subtotalSupplierXof: 18000,
      status: "CONFIRMED",
    });
    expect(byId.get("sup-B")).toEqual({
      supplierOrderId: "sup-B",
      subtotalSupplierXof: 9000,
      status: "ADJUSTED",
    });
    expect(byId.get("sup-C")).toEqual({
      supplierOrderId: "sup-C",
      subtotalSupplierXof: 0,
      status: "REJECTED",
    });
  });

  it("génère des numéros de commande uniques à haute entropie (#7)", () => {
    const n1 = buildUniqueOrderNumber(2026, 42);
    const n2 = buildUniqueOrderNumber(2026, 42);
    expect(n1).toMatch(/^FS-2026-00042-[0-9A-F]{6}$/);
    expect(n2).toMatch(/^FS-2026-00042-[0-9A-F]{6}$/);
    expect(n1).not.toBe(n2);
  });
});
