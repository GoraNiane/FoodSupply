import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildWavePaymentUrl,
  DEFAULT_WAVE_MERCHANT_URL,
  isValidWaveMerchantUrl,
  verifyWebhookHmacSignature,
} from "@/modules/payments/wave";
import { generateInvoicePdfBytes, sanitizePdfText } from "@/modules/invoices/pdf-generator";

describe("Paiement direct Wave Sénégal", () => {
  it("construit le lien Wave officiel FoodSupply avec le montant exact pré-rempli", () => {
    const url = buildWavePaymentUrl(25000);
    expect(url).toBe(`${DEFAULT_WAVE_MERCHANT_URL}?amount=25000`);
    expect(url).toBe("https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/?amount=25000");
  });

  it("arrondit un montant et rejette les montants nuls ou négatifs", () => {
    expect(buildWavePaymentUrl(14750.4)).toContain("?amount=14750");
    expect(() => buildWavePaymentUrl(0)).toThrow();
    expect(() => buildWavePaymentUrl(-500)).toThrow();
  });

  it("valide strictement le domaine HTTPS pay.wave.com/m/ (anti open-redirect)", () => {
    expect(isValidWaveMerchantUrl("https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/")).toBe(true);
    expect(isValidWaveMerchantUrl("http://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/")).toBe(false);
    expect(isValidWaveMerchantUrl("https://evil.example/m/M_sn_UoRxc-HJ7lK-/c/sn/")).toBe(false);
    expect(isValidWaveMerchantUrl("javascript:alert(1)")).toBe(false);

    // Fallback sécurisé vers le lien officiel si une URL invalide est passée
    expect(buildWavePaymentUrl(12000, "https://evil.example/steal")).toBe(
      "https://pay.wave.com/m/M_sn_UoRxc-HJ7lK-/c/sn/?amount=12000"
    );
  });

  it("vérifie les signatures HMAC-SHA256 webhook en temps constant", () => {
    const secret = "whsec_foodsupply_test_secret";
    const body = JSON.stringify({ eventId: "evt_1", eventType: "payment.succeeded" });
    const sig = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

    expect(verifyWebhookHmacSignature({ rawBody: body, signatureHeader: sig, secret })).toBe(true);
    expect(
      verifyWebhookHmacSignature({ rawBody: body, signatureHeader: `sha256=${sig}`, secret })
    ).toBe(true);
    expect(
      verifyWebhookHmacSignature({ rawBody: `${body} `, signatureHeader: sig, secret })
    ).toBe(false);
    expect(
      verifyWebhookHmacSignature({ rawBody: body, signatureHeader: "invalid", secret })
    ).toBe(false);
  });
});

describe("Génération de facture PDF FoodSupply", () => {
  it("normalise les caractères spéciaux (œ, espaces insécables étroites) pour WinAnsi", () => {
    expect(sanitizePdfText("Œufs frais — Sacré-Cœur\u202f25\u00a0000")).toBe(
      "OEufs frais - Sacré-Coeur 25 000"
    );
  });

  it("génère un document PDF valide et non vide avec l'en-tête %PDF-", async () => {
    const bytes = await generateInvoicePdfBytes({
      invoiceNumber: "FAC-2026-00001-A1B2",
      orderNumber: "FS-2026-00001-ABCDEF",
      issuedAt: new Date("2026-11-26T10:00:00Z"),
      paymentStatus: "PAID",
      paymentMethod: "Wave Sénégal",
      currency: "XOF",
      subtotalClientXof: 48000,
      deliveryFeeXof: 2000,
      totalClientXof: 50000,
      company: {
        legalName: "FoodSupply Sénégal SARL",
        address: "Sacré-Cœur 3, VDN, Dakar, Sénégal",
        ninea: "009876543",
        rc: "SN-DKR-2026-B-1234",
        phone: "+221 33 820 45 00",
        email: "contact@foodsupply.sn",
        currency: "XOF",
      },
      client: {
        restaurantName: "Restaurant Le Teranga",
        contactName: "Awa Ndiaye",
        phone: "+221 77 555 11 22",
        street: "Route des Almadies",
        neighborhood: "Almadies",
      },
      items: [
        {
          productName: "Plateau 30 Œufs frais calibrés",
          unitLabel: "Plateau 30",
          quantity: 10,
          unitPriceXof: 3200,
          lineTotalXof: 32000,
        },
        {
          productName: "Huile végétale bidon 20L",
          unitLabel: "Bidon 20L",
          quantity: 1,
          unitPriceXof: 16000,
          lineTotalXof: 16000,
        },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(1500);
    const header = Buffer.from(bytes.slice(0, 5)).toString("ascii");
    expect(header).toBe("%PDF-");
  });
});
