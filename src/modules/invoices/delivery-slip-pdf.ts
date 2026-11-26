import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatDateDakar } from "@/lib/utils/format";
import { sanitizePdfText } from "@/modules/invoices/pdf-generator";
import type { CompanyProfileConfig } from "@/modules/payments/wave";

export interface DeliverySlipPdfData {
  orderNumber: string;
  createdAt: Date | string;
  deliverySlot?: string | null;
  requiresColdChain: boolean;
  hasFragileItems: boolean;
  driverName?: string | null;
  driverPhone?: string | null;
  company: CompanyProfileConfig;
  client: {
    restaurantName?: string;
    contactName?: string;
    phone?: string;
    street?: string;
    neighborhood?: string;
    landmark?: string | null;
    mapsUrl?: string | null;
  };
  notes?: string | null;
  items: Array<{
    productName: string;
    unitLabel: string;
    quantity: number;
    isFragile: boolean;
    storageType: string;
  }>;
}

/**
 * Génère un Bon de Livraison (BL) PDF destiné au livreur et au réceptionnaire.
 * Ne contient JAMAIS aucun prix d'achat, aucune marge ni identité fournisseur.
 */
export async function generateDeliverySlipPdfBytes(
  data: DeliverySlipPdfData
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(sanitizePdfText(`Bon de livraison ${data.orderNumber} - FoodSupply`));

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 44;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const colorNavy = rgb(0.05, 0.11, 0.27);
  const colorBrand = rgb(0.15, 0.39, 0.92);
  const colorSlate = rgb(0.36, 0.42, 0.5);
  const colorBorder = rgb(0.84, 0.87, 0.92);
  const colorLightBg = rgb(0.96, 0.97, 0.99);
  const colorAlert = rgb(0.76, 0.25, 0.05);

  // En-tête
  page.drawRectangle({
    x: 0,
    y: pageHeight - 86,
    width: pageWidth,
    height: 86,
    color: colorNavy,
  });

  page.drawText("FOODSUPPLY DAKAR — BON DE LIVRAISON", {
    x: margin,
    y: pageHeight - 40,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(sanitizePdfText(`${data.company.phone} | ${data.company.address}`), {
    x: margin,
    y: pageHeight - 58,
    size: 9,
    font: fontRegular,
    color: rgb(0.78, 0.85, 0.98),
  });

  const rightTitle = sanitizePdfText(`BL-${data.orderNumber}`);
  const rightW = fontBold.widthOfTextAtSize(rightTitle, 11);
  page.drawText(rightTitle, {
    x: pageWidth - margin - rightW,
    y: pageHeight - 40,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const dateLine = sanitizePdfText(`Date : ${formatDateDakar(data.createdAt, true)}`);
  const dateW = fontRegular.widthOfTextAtSize(dateLine, 9);
  page.drawText(dateLine, {
    x: pageWidth - margin - dateW,
    y: pageHeight - 58,
    size: 9,
    font: fontRegular,
    color: rgb(0.78, 0.85, 0.98),
  });

  y = pageHeight - 112;

  // Destinataire & Logistique
  const colW = (pageWidth - margin * 2 - 20) / 2;
  page.drawText("DESTINATAIRE (CLIENT A LIVRER)", {
    x: margin,
    y,
    size: 8.5,
    font: fontBold,
    color: colorBrand,
  });
  const clientLines = [
    data.client.restaurantName || data.client.contactName || "Client FoodSupply",
    data.client.contactName ? `Contact : ${data.client.contactName}` : "",
    data.client.phone ? `Tel / WhatsApp : ${data.client.phone}` : "",
    `${data.client.street ?? ""}${data.client.street && data.client.neighborhood ? ", " : ""}${data.client.neighborhood ?? ""}, Dakar`,
    data.client.landmark ? `Repere : ${data.client.landmark}` : "",
    data.client.mapsUrl ? `GPS : ${data.client.mapsUrl}` : "",
  ].filter(Boolean);

  clientLines.forEach((line, i) => {
    page.drawText(sanitizePdfText(line).slice(0, 58), {
      x: margin,
      y: y - 16 - i * 13,
      size: i === 0 ? 10.5 : 9,
      font: i === 0 ? fontBold : fontRegular,
      color: i === 0 ? colorNavy : colorSlate,
    });
  });

  const rightX = margin + colW + 20;
  page.drawText("CONSIGNES LIVRAISON", {
    x: rightX,
    y,
    size: 8.5,
    font: fontBold,
    color: colorBrand,
  });
  const logisticsLines = [
    data.driverName ? `Livreur : ${data.driverName}` : "Livreur : Equipe FoodSupply",
    data.driverPhone ? `Tel livreur : ${data.driverPhone}` : "",
    data.deliverySlot ? `Creneau : ${data.deliverySlot.replace(/_/g, " ")}` : "",
    data.requiresColdChain ? "ATTENTION : CHAINE DU FROID REQUISE" : "Conservation : Ambiant",
    data.hasFragileItems ? "ATTENTION : COLIS FRAGILES (OEUFS / VERRE)" : "",
  ].filter(Boolean);

  logisticsLines.forEach((line, i) => {
    const isWarning = line.startsWith("ATTENTION");
    page.drawText(sanitizePdfText(line), {
      x: rightX,
      y: y - 16 - i * 13,
      size: 9,
      font: isWarning ? fontBold : fontRegular,
      color: isWarning ? colorAlert : colorSlate,
    });
  });

  y -= 110;

  if (data.notes) {
    page.drawRectangle({
      x: margin,
      y: y - 24,
      width: pageWidth - margin * 2,
      height: 30,
      color: colorLightBg,
      borderColor: colorBorder,
      borderWidth: 1,
    });
    page.drawText(sanitizePdfText(`Note client : ${data.notes}`).slice(0, 95), {
      x: margin + 10,
      y: y - 12,
      size: 9,
      font: fontRegular,
      color: colorNavy,
    });
    y -= 42;
  }

  // Tableau des colis à livrer (sans prix)
  const drawHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: pageWidth - margin * 2,
      height: 24,
      color: colorNavy,
    });
    page.drawText("PRODUIT A LIVRER", {
      x: margin + 10,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("CONDITIONNEMENT", {
      x: margin + 255,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("QTE", {
      x: margin + 390,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("CONTROLE [OK]", {
      x: pageWidth - margin - 82,
      y: y - 12,
      size: 8.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    y -= 28;
  };

  drawHeader();

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    if (y < 160) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawHeader();
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

    const tags = [
      item.storageType === "FROZEN" ? "[SURGELE]" : item.storageType === "CHILLED" ? "[FRAIS]" : "",
      item.isFragile ? "[FRAGILE]" : "",
    ]
      .filter(Boolean)
      .join(" ");

    page.drawText(sanitizePdfText(`${item.productName} ${tags}`).slice(0, 44), {
      x: margin + 10,
      y: y - 11,
      size: 9,
      font: fontRegular,
      color: colorNavy,
    });
    page.drawText(sanitizePdfText(item.unitLabel).slice(0, 22), {
      x: margin + 255,
      y: y - 11,
      size: 8.5,
      font: fontRegular,
      color: colorSlate,
    });
    page.drawText(String(item.quantity), {
      x: margin + 395,
      y: y - 11,
      size: 10,
      font: fontBold,
      color: colorNavy,
    });

    // Case à cocher visuelle
    page.drawRectangle({
      x: pageWidth - margin - 52,
      y: y - 14,
      width: 12,
      height: 12,
      borderColor: colorNavy,
      borderWidth: 1,
    });

    y -= 24;
  }

  // Bloc Signatures
  y = Math.min(y - 28, 175);
  const signW = (pageWidth - margin * 2 - 20) / 2;

  page.drawRectangle({
    x: margin,
    y: 62,
    width: signW,
    height: 92,
    borderColor: colorBorder,
    borderWidth: 1,
  });
  page.drawText("SIGNATURE LIVREUR FOODSUPPLY", {
    x: margin + 10,
    y: 138,
    size: 8.5,
    font: fontBold,
    color: colorNavy,
  });
  page.drawText("Date & heure de remise :", {
    x: margin + 10,
    y: 74,
    size: 8,
    font: fontRegular,
    color: colorSlate,
  });

  page.drawRectangle({
    x: margin + signW + 20,
    y: 62,
    width: signW,
    height: 92,
    borderColor: colorBorder,
    borderWidth: 1,
  });
  page.drawText("NOM & SIGNATURE RECEPTIONNAIRE (CLIENT)", {
    x: margin + signW + 30,
    y: 138,
    size: 8.5,
    font: fontBold,
    color: colorNavy,
  });
  page.drawText("Marchandise recue conforme :", {
    x: margin + signW + 30,
    y: 74,
    size: 8,
    font: fontRegular,
    color: colorSlate,
  });

  return pdfDoc.save();
}
