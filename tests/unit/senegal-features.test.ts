import { describe, expect, it } from "vitest";
import {
  computeDeliveryFeeXof,
  DEFAULT_DELIVERY_FEE_RULES,
  resolveZoneForNeighborhood,
} from "@/modules/deliveries/fee-calculator";
import {
  normalizeVolumeTiers,
  resolveVolumeTierUnitPrice,
} from "@/modules/catalog/pricing";
import {
  buildCreditReminderMessage,
  buildDriverDispatchedMessage,
  buildOrderConfirmedWaveMessage,
  buildWhatsAppLink,
  normalizeSenegalWhatsAppPhone,
} from "@/modules/notifications/whatsapp";
import { generateInvoicePdfBytes } from "@/modules/invoices/pdf-generator";

describe("Zones tarifaires de livraison Dakar", () => {
  it("détecte automatiquement les 4 zones de Dakar (accents et casse insensibles)", () => {
    expect(resolveZoneForNeighborhood("Sacre-Coeur", DEFAULT_DELIVERY_FEE_RULES)?.feeXof).toBe(
      1500
    );
    expect(resolveZoneForNeighborhood("Les Almadies", DEFAULT_DELIVERY_FEE_RULES)?.feeXof).toBe(
      2000
    );
    expect(
      resolveZoneForNeighborhood("Parcelles Assainies", DEFAULT_DELIVERY_FEE_RULES)?.feeXof
    ).toBe(3000);
    expect(resolveZoneForNeighborhood("Diamniadio", DEFAULT_DELIVERY_FEE_RULES)?.feeXof).toBe(
      4500
    );
  });

  it("applique le tarif de zone + suppléments froid/fragile ou la gratuité au seuil", () => {
    const res = computeDeliveryFeeXof({
      subtotalClientXof: 50000,
      neighborhood: "Parcelles Assainies",
      requiresColdChain: true,
      hasFragileItems: true,
      rules: DEFAULT_DELIVERY_FEE_RULES,
    });
    expect(res.baseFeeXof).toBe(3000);
    expect(res.totalDeliveryFeeXof).toBe(4500);
    expect(res.matchedZoneLabel).toContain("Zone 3");

    const free = computeDeliveryFeeXof({
      subtotalClientXof: 300000,
      neighborhood: "Rufisque",
      requiresColdChain: true,
      hasFragileItems: true,
      rules: DEFAULT_DELIVERY_FEE_RULES,
    });
    expect(free.freeDeliveryApplied).toBe(true);
    expect(free.totalDeliveryFeeXof).toBe(0);
  });
});

describe("Tarifs dégressifs par volume (Gros & Demi-gros)", () => {
  const tiers = normalizeVolumeTiers([
    { minQty: 20, unitPriceXof: 2900 },
    { minQty: 5, unitPriceXof: 3050 },
    { minQty: 1, unitPriceXof: 3100 }, // ignoré car minQty < 2
  ]);

  it("normalise et trie les paliers par minQty croissant", () => {
    expect(tiers).toEqual([
      { minQty: 5, unitPriceXof: 3050 },
      { minQty: 20, unitPriceXof: 2900 },
    ]);
  });

  it("applique le meilleur palier applicable sans jamais dépasser le prix de base", () => {
    expect(resolveVolumeTierUnitPrice(3200, 3, tiers).effectiveUnitPriceXof).toBe(3200);
    expect(resolveVolumeTierUnitPrice(3200, 5, tiers).effectiveUnitPriceXof).toBe(3050);
    expect(resolveVolumeTierUnitPrice(3200, 25, tiers).effectiveUnitPriceXof).toBe(2900);
    // Si le prix de base baisse sous le palier, on garde le prix de base
    expect(resolveVolumeTierUnitPrice(2800, 25, tiers).effectiveUnitPriceXof).toBe(2800);
  });
});

describe("Templates WhatsApp Sénégal", () => {
  it("normalise les numéros sénégalais 9 chiffres avec indicatif 221", () => {
    expect(normalizeSenegalWhatsAppPhone("77 123 45 67")).toBe("221771234567");
    expect(normalizeSenegalWhatsAppPhone("+221 78-999-00-11")).toBe("221789990011");
    expect(normalizeSenegalWhatsAppPhone("00221761112233")).toBe("221761112233");
  });

  it("génère des liens wa.me pré-remplis pour confirmation Wave, livreur et relance crédit", () => {
    const confirmMsg = buildOrderConfirmedWaveMessage({
      clientName: "Le Teranga",
      orderNumber: "FS-2026-00001-ABCDEF",
      totalClientXof: 45000,
      waveUrl: "https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/?amount=45000",
    });
    expect(confirmMsg).toContain("45 000 FCFA");
    expect(confirmMsg).toContain("?amount=45000");

    const waLink = buildWhatsAppLink("77 123 45 67", confirmMsg);
    expect(waLink).toMatch(/^https:\/\/wa\.me\/221771234567\?text=/);

    const driverMsg = buildDriverDispatchedMessage({
      clientName: "Le Teranga",
      orderNumber: "FS-2026-00001-ABCDEF",
      driverName: "Mamadou Diop",
      driverPhone: "+221 77 000 11 22",
    });
    expect(driverMsg).toContain("Mamadou Diop");

    const creditMsg = buildCreditReminderMessage({
      clientName: "Hôtel Dakar",
      orderNumber: "FS-2026-00002-123456",
      totalClientXof: 120000,
      dueAt: "2026-12-03T00:00:00Z",
      waveUrl: "https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/?amount=120000",
    });
    expect(creditMsg).toContain("120 000 FCFA");
  });
});

describe("Devis / Facture Proforma PDF avant paiement", () => {
  it("génère un PDF Proforma valide avant règlement", async () => {
    const bytes = await generateInvoicePdfBytes({
      documentType: "PROFORMA",
      invoiceNumber: "PRO-FS-2026-00001-ABCDEF",
      orderNumber: "FS-2026-00001-ABCDEF",
      issuedAt: new Date("2026-11-26T09:00:00Z"),
      paymentStatus: "UNPAID",
      paymentMethod: "Wave Sénégal",
      currency: "XOF",
      subtotalClientXof: 30000,
      deliveryFeeXof: 1500,
      totalClientXof: 31500,
      company: {
        legalName: "FoodSupply Sénégal SARL",
        address: "Sacré-Cœur 3, Dakar",
        ninea: "009988776",
        rc: "SN-DKR-2026",
        phone: "+221 33 820 45 00",
        email: "contact@foodsupply.sn",
        currency: "XOF",
      },
      client: {
        restaurantName: "Boulangerie Point E",
        contactName: "Ousmane Sarr",
        phone: "+221 77 444 55 66",
      },
      items: [
        {
          productName: "Farine pâtissière 25 kg",
          unitLabel: "Sac 25 kg",
          quantity: 2,
          unitPriceXof: 15000,
          lineTotalXof: 30000,
        },
      ],
    });
    expect(bytes.byteLength).toBeGreaterThan(1400);
    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });
});
