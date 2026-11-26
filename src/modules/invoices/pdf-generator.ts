import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateDakar } from "@/lib/utils/format";
import type { CompanyProfileConfig } from "@/modules/payments/wave";

export interface InvoicePdfData {
  documentType?: "FACTURE" | "PROFORMA";
  invoiceNumber: string;
  orderNumber: string;
  issuedAt: Date | string;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  paymentMethod: string;
  currency: string;
  subtotalClientXof: number;
  deliveryFeeXof: number;
  totalClientXof: number;
  company: CompanyProfileConfig;
  client: {
    restaurantName?: string;
    contactName?: string;
    phone?: string;
    email?: string | null;
    street?: string;
    neighborhood?: string;
    landmark?: string | null;
  };
  items: Array<{
    productName: string;
    unitLabel: string;
    quantity: number;
    unitPriceXof: number;
    lineTotalXof: number;
  }>;
}

/**
 * Normalise une chaîne pour l'encodage WinAnsi des polices standard PDF (Helvetica)
 * afin d'éviter toute erreur sur les espaces insécables étroites (\u202f) ou ligatures (œ).
 */
export function sanitizePdfText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/\u202f|\u00a0/g, " ")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .trim();
}

function formatXofPdf(amount: number): string {
  const safe = Math.round(amount);
  const str = String(Math.abs(safe)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${safe < 0 ? "-" : ""}${str} FCFA`;
}

function paymentStatusLabel(status: InvoicePdfData["paymentStatus"]): string {
  switch (status) {
    case "PAID":
      return "PAYEE";
    case "REFUNDED":
      return "REMBOURSEE";
    default:
      return "EN ATTENTE";
  }
}

/**
 * Génère une facture commerciale FoodSupply Dakar au format PDF (bytes déterministes).
 * Ne contient JAMAIS aucune information fournisseur (FoodSupply = vendeur unique).
 */
export async function generateInvoicePdfBytes(data: InvoicePdfData): Promise<Uint8Array> {
  const isProforma = data.documentType === "PROFORMA";
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(
    sanitizePdfText(
      `${isProforma ? "Devis Proforma" : "Facture"} ${data.invoiceNumber} - FoodSupply`
    )
  );
  pdfDoc.setAuthor(sanitizePdfText(data.company.legalName));

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 44;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const colorNavy = rgb(0.05, 0.11, 0.27); // #0D1B44
  const colorBrand = rgb(0.15, 0.39, 0.92); // #2563EB
  const colorSlate = rgb(0.36, 0.42, 0.5);
  const colorBorder = rgb(0.86, 0.89, 0.94);
  const colorLightBg = rgb(0.96, 0.97, 0.99);
  const colorSuccess = rgb(0.08, 0.5, 0.24);

  // Bandeau supérieur bleu nuit
  page.drawRectangle({
    x: 0,
    y: pageHeight - 96,
    width: pageWidth,
    height: 96,
    color: colorNavy,
  });

  page.drawText(sanitizePdfText("FOODSUPPLY"), {
    x: margin,
    y: pageHeight - 44,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(sanitizePdfText("Approvisionnement professionnel - Dakar, Senegal"), {
    x: margin,
    y: pageHeight - 62,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.78, 0.85, 0.98),
  });

  const rightHeaderText = sanitizePdfText(
    isProforma ? `PROFORMA ${data.invoiceNumber}` : `FACTURE ${data.invoiceNumber}`
  );
  const rightHeaderWidth = fontBold.widthOfTextAtSize(rightHeaderText, 14);
  page.drawText(rightHeaderText, {
    x: pageWidth - margin - rightHeaderWidth,
    y: pageHeight - 44,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const dateLine = sanitizePdfText(`Emise le ${formatDateDakar(data.issuedAt, false)} (Dakar)`);
  const dateWidth = fontRegular.widthOfTextAtSize(dateLine, 9.5);
  page.drawText(dateLine, {
    x: pageWidth - margin - dateWidth,
    y: pageHeight - 62,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.78, 0.85, 0.98),
  });

  y = pageHeight - 122;

  // Bloc Émetteur (gauche) et Client (droite)
  const colGap = 24;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  // Émetteur
  page.drawText("EMETTEUR", { x: margin, y, size: 8, font: fontBold, color: colorBrand });
  page.drawText(sanitizePdfText(data.company.legalName), {
    x: margin,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: colorNavy,
  });
  const issuerLines = [
    data.company.address,
    `Tel : ${data.company.phone}`,
    `Email : ${data.company.email}`,
    data.company.ninea ? `NINEA : ${data.company.ninea}` : "",
    data.company.rc ? `RC : ${data.company.rc}` : "",
  ].filter(Boolean);

  issuerLines.forEach((line, i) => {
    page.drawText(sanitizePdfText(line), {
      x: margin,
      y: y - 30 - i * 13,
      size: 9,
      font: fontRegular,
      color: colorSlate,
    });
  });

  // Client
  const rightColX = margin + colWidth + colGap;
  page.drawText("FACTURE A (CLIENT)", {
    x: rightColX,
    y,
    size: 8,
    font: fontBold,
    color: colorBrand,
  });
  const clientTitle = data.client.restaurantName || data.client.contactName || "Client FoodSupply";
  page.drawText(sanitizePdfText(clientTitle), {
    x: rightColX,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: colorNavy,
  });

  const clientLines = [
    data.client.contactName ? `Contact : ${data.client.contactName}` : "",
    data.client.phone ? `Tel : ${data.client.phone}` : "",
    data.client.street || data.client.neighborhood
      ? `${data.client.street ?? ""}${data.client.street && data.client.neighborhood ? ", " : ""}${data.client.neighborhood ?? ""}, Dakar`
      : "Dakar, Senegal",
    data.client.email ? `Email : ${data.client.email}` : "",
  ].filter(Boolean);

  clientLines.forEach((line, i) => {
    page.drawText(sanitizePdfText(line), {
      x: rightColX,
      y: y - 30 - i * 13,
      size: 9,
      font: fontRegular,
      color: colorSlate,
    });
  });

  y -= 114;

  // Bandeau méta commande & statut paiement
  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: pageWidth - margin * 2,
    height: 36,
    color: colorLightBg,
    borderColor: colorBorder,
    borderWidth: 1,
  });

  page.drawText(sanitizePdfText(`Commande : ${data.orderNumber}`), {
    x: margin + 12,
    y: y - 14,
    size: 9.5,
    font: fontBold,
    color: colorNavy,
  });

  page.drawText(sanitizePdfText(`Reglement : ${data.paymentMethod}`), {
    x: margin + 215,
    y: y - 14,
    size: 9.5,
    font: fontRegular,
    color: colorSlate,
  });

  const statusText = isProforma
    ? "DEVIS PROFORMA - AVANT PAIEMENT"
    : `STATUT : ${paymentStatusLabel(data.paymentStatus)}`;
  const statusWidth = fontBold.widthOfTextAtSize(statusText, 9.5);
  page.drawText(statusText, {
    x: pageWidth - margin - 12 - statusWidth,
    y: y - 14,
    size: 9.5,
    font: fontBold,
    color: data.paymentStatus === "PAID" ? colorSuccess : colorBrand,
  });

  y -= 52;

  // En-tête du tableau produits
  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: pageWidth - margin * 2,
      height: 24,
      color: colorNavy,
    });

    page.drawText("DESIGNATION", {
      x: margin + 10,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("UNITE", {
      x: margin + 245,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("QTE", {
      x: margin + 325,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("P.U. (FCFA)", {
      x: margin + 370,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const totalColText = "TOTAL (FCFA)";
    const totalColWidth = fontBold.widthOfTextAtSize(totalColText, 8.5);
    page.drawText(totalColText, {
      x: pageWidth - margin - 10 - totalColWidth,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    y -= 28;
  };

  drawTableHeader();

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    if (y < 140) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawTableHeader();
    }

    if (i % 2 === 1) {
      page.drawRectangle({
        x: margin,
        y: y - 18,
        width: pageWidth - margin * 2,
        height: 22,
        color: colorLightBg,
      });
    }

    const nameTrunc = sanitizePdfText(item.productName).slice(0, 42);
    const unitTrunc = sanitizePdfText(item.unitLabel).slice(0, 14);

    page.drawText(nameTrunc, {
      x: margin + 10,
      y: y - 11,
      size: 9,
      font: fontRegular,
      color: colorNavy,
    });
    page.drawText(unitTrunc, {
      x: margin + 245,
      y: y - 11,
      size: 8.5,
      font: fontRegular,
      color: colorSlate,
    });
    page.drawText(String(item.quantity), {
      x: margin + 328,
      y: y - 11,
      size: 9,
      font: fontRegular,
      color: colorNavy,
    });
    page.drawText(formatXofPdf(item.unitPriceXof), {
      x: margin + 365,
      y: y - 11,
      size: 8.5,
      font: fontRegular,
      color: colorSlate,
    });
    const lineTot = formatXofPdf(item.lineTotalXof);
    const lineTotWidth = fontBold.widthOfTextAtSize(lineTot, 9);
    page.drawText(lineTot, {
      x: pageWidth - margin - 10 - lineTotWidth,
      y: y - 11,
      size: 9,
      font: fontBold,
      color: colorNavy,
    });

    y -= 22;
  }

  // Ligne de séparation
  page.drawLine({
    start: { x: margin, y: y - 4 },
    end: { x: pageWidth - margin, y: y - 4 },
    thickness: 1,
    color: colorBorder,
  });

  y -= 24;

  // Bloc Totaux à droite
  const boxWidth = 235;
  const boxX = pageWidth - margin - boxWidth;

  const drawTotalRow = (label: string, value: string, bold = false, highlight = false) => {
    const f = bold ? fontBold : fontRegular;
    const sz = bold ? 11 : 9.5;
    const col = highlight ? colorBrand : colorNavy;
    page.drawText(sanitizePdfText(label), { x: boxX + 8, y, size: sz, font: f, color: bold ? colorNavy : colorSlate });
    const w = f.widthOfTextAtSize(value, sz);
    page.drawText(value, { x: pageWidth - margin - 8 - w, y, size: sz, font: f, color: col });
    y -= bold ? 22 : 17;
  };

  drawTotalRow("Sous-total produits", formatXofPdf(data.subtotalClientXof));
  drawTotalRow("Frais de livraison Dakar", formatXofPdf(data.deliveryFeeXof));

  page.drawRectangle({
    x: boxX,
    y: y - 6,
    width: boxWidth,
    height: 26,
    color: colorLightBg,
    borderColor: colorBrand,
    borderWidth: 1,
  });
  y += 2;
  drawTotalRow("TOTAL TTC", formatXofPdf(data.totalClientXof), true, true);

  // Pied de page
  const footerText = sanitizePdfText(
    `${data.company.legalName} - Dakar, Senegal | Devise : ${data.currency} | Merci pour votre confiance.`
  );
  const footerW = fontRegular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: (pageWidth - footerW) / 2,
    y: 28,
    size: 8,
    font: fontRegular,
    color: colorSlate,
  });

  return pdfDoc.save();
}
