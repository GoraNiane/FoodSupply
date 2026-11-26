import { describe, expect, it } from "vitest";
import { buildFrenchExcelCsv, escapeCsvCell } from "@/lib/utils/csv";
import { generateDeliverySlipPdfBytes } from "@/modules/invoices/delivery-slip-pdf";

describe("Export comptable CSV (Excel France)", () => {
  it("neutralise les formules CSV malveillantes (CSV Formula Injection)", () => {
    expect(escapeCsvCell("=SUM(A1:A5)")).toBe("'=SUM(A1:A5)");
    expect(escapeCsvCell("+221771234567")).toBe("'+221771234567");
    expect(escapeCsvCell("-100")).toBe("'-100");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
    expect(escapeCsvCell("Plateau; 30 œufs")).toBe('"Plateau; 30 œufs"');
  });

  it("génère un CSV avec BOM UTF-8 et séparateur point-virgule", () => {
    const csv = buildFrenchExcelCsv(
      ["Numéro", "Client", "Total XOF"],
      [["FS-2026-00001", "Le Teranga", 45000]]
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Numéro;Client;Total XOF");
    expect(csv).toContain("FS-2026-00001;Le Teranga;45000");
  });
});

describe("Bon de livraison (BL) PDF livreur", () => {
  it("génère un BL PDF valide sans aucun prix d'achat ni marge", async () => {
    const bytes = await generateDeliverySlipPdfBytes({
      orderNumber: "FS-2026-00010-ABCDEF",
      createdAt: new Date("2026-11-26T07:00:00Z"),
      deliverySlot: "TOT_06H30_08H30",
      requiresColdChain: true,
      hasFragileItems: true,
      driverName: "Mamadou Diop",
      driverPhone: "+221 77 123 45 67",
      company: {
        legalName: "FoodSupply Sénégal SARL",
        address: "Sacré-Cœur 3, VDN, Dakar",
        ninea: "009988776",
        rc: "SN-DKR-2026",
        phone: "+221 33 820 45 00",
        email: "contact@foodsupply.sn",
        currency: "XOF",
      },
      client: {
        restaurantName: "Fast-Food Almadies",
        contactName: "Cheikh Ndiaye",
        phone: "+221 78 555 22 11",
        street: "Route des Almadies",
        neighborhood: "Almadies",
        landmark: "Face Station Total",
        mapsUrl: "https://www.google.com/maps?q=14.745,-17.515",
      },
      notes: "Livrer avant 8h à l'entrée cuisine",
      items: [
        {
          productName: "Plateau 30 Œufs frais",
          unitLabel: "Plateau 30",
          quantity: 12,
          isFragile: true,
          storageType: "AMBIENT",
        },
        {
          productName: "Filet de poulet surgelé",
          unitLabel: "Carton 10 kg",
          quantity: 3,
          isFragile: false,
          storageType: "FROZEN",
        },
      ],
    });

    expect(bytes.byteLength).toBeGreaterThan(1500);
    expect(Buffer.from(bytes.slice(0, 5)).toString("ascii")).toBe("%PDF-");
  });
});
